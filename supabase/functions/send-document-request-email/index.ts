import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_WEBHOOK_URL = Deno.env.get('MAIL_WEBHOOK_URL') ?? '';
const MAIL_WEBHOOK_TOKEN = Deno.env.get('MAIL_WEBHOOK_TOKEN') ?? '';
const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL') ?? 'NRI Bridge India <notifications@nribridgeindia.com>';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? '';

type DocumentRequestPayload = {
  requestId: string;
  clientEmail: string;
  clientName?: string;
  serviceType?: string;
  documentTitle: string;
  requestNote?: string;
  dueAt?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendViaResend(payload: DocumentRequestPayload) {
  const loginUrl = APP_BASE_URL
    ? `${APP_BASE_URL.replace(/\/$/, '')}/dashboard.html${payload.requestId ? `?request_id=${payload.requestId}` : ''}`
    : `https://nribridgeindia.com/dashboard.html${payload.requestId ? `?request_id=${payload.requestId}` : ''}`;

  let formattedDate = 'No fixed deadline';
  if (payload.dueAt) {
    try {
      const d = new Date(payload.dueAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      console.warn('Invalid date provided:', payload.dueAt);
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM_EMAIL,
      to: [payload.clientEmail],
      subject: `Secure document request: ${payload.documentTitle}`,
      template: {
        id: 'd4ab1f99-1330-479b-9367-253ce85ad048', // Document Request Template
        variables: {
          FIRST_NAME: payload.clientName?.trim().split(' ')[0] || 'there',
          DOC_TITLE: payload.documentTitle,
          SERVICE_TYPE: payload.serviceType || 'Property Management',
          DUE_DATE: formattedDate,
          INSTRUCTIONS: payload.requestNote || '',
          UPLOAD_URL: loginUrl
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Resend email send failed');
  }
  return { provider: 'resend', providerMessageId: data?.id ?? null };
}

async function sendViaWebhook(payload: DocumentRequestPayload) {
  const loginUrl = APP_BASE_URL
    ? `${APP_BASE_URL.replace(/\/$/, '')}/dashboard.html${payload.requestId ? `?request_id=${payload.requestId}` : ''}`
    : `https://nribridgeindia.com/dashboard.html${payload.requestId ? `?request_id=${payload.requestId}` : ''}`;

  let formattedDate = 'No fixed deadline';
  if (payload.dueAt) {
    try {
      const d = new Date(payload.dueAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      console.warn('Invalid date provided:', payload.dueAt);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (MAIL_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${MAIL_WEBHOOK_TOKEN}`;
  const res = await fetch(MAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: MAIL_FROM_EMAIL,
      to: payload.clientEmail,
      subject: `Secure document request: ${payload.documentTitle}`,
      template: {
        id: 'd4ab1f99-1330-479b-9367-253ce85ad048',
        variables: {
          FIRST_NAME: payload.clientName?.trim().split(' ')[0] || 'there',
          DOC_TITLE: payload.documentTitle,
          SERVICE_TYPE: payload.serviceType || 'Property Management',
          DUE_DATE: formattedDate,
          INSTRUCTIONS: payload.requestNote || '',
          UPLOAD_URL: loginUrl
        },
      },
      tags: ['document-request'],
      metadata: {
        requestId: payload.requestId,
        clientEmail: payload.clientEmail,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Mail webhook send failed');
  }
  return {
    provider: 'webhook',
    providerMessageId: data?.id ?? data?.messageId ?? null,
  };
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const jwtPayload = token ? decodeJwtPayload(token) : null;
    const role = jwtPayload?.app_metadata?.role;
    if (!role || role !== 'admin') {
      return json({ error: 'Admin access required' }, 403);
    }

    if (!MAIL_FROM_EMAIL) {
      return json({ error: 'MAIL_FROM_EMAIL is not configured' }, 500);
    }

    let payload: DocumentRequestPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!payload.requestId || !payload.clientEmail || !payload.documentTitle) {
      return json({ error: 'requestId, clientEmail, and documentTitle are required' }, 400);
    }

    let result;
    if (RESEND_API_KEY) {
      result = await sendViaResend(payload);
    } else if (MAIL_WEBHOOK_URL) {
      result = await sendViaWebhook(payload);
    } else {
      return json({ error: 'No mail provider configured. Set RESEND_API_KEY or MAIL_WEBHOOK_URL.' }, 500);
    }

    return json({
      ok: true,
      requestId: payload.requestId,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('send-document-request-email crash:', err);
    return json({
      error: err instanceof Error ? err.message : 'Internal Server Error',
    }, 500);
  }
});
