import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_WEBHOOK_URL = Deno.env.get('MAIL_WEBHOOK_URL') ?? '';
const MAIL_WEBHOOK_TOKEN = Deno.env.get('MAIL_WEBHOOK_TOKEN') ?? '';
const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL') ?? '';
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

function buildMessage(payload: DocumentRequestPayload) {
  const dueText = payload.dueAt
    ? new Date(payload.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No fixed deadline';
  const loginUrl = APP_BASE_URL
    ? `${APP_BASE_URL.replace(/\/$/, '')}/dashboard.html`
    : 'your secure dashboard';
  const safeName = payload.clientName?.trim() || 'there';
  const serviceLine = payload.serviceType ? `<p><strong>Related service:</strong> ${escapeHtml(payload.serviceType)}</p>` : '';
  const noteLine = payload.requestNote
    ? `<p><strong>Instructions:</strong><br>${escapeHtml(payload.requestNote).replace(/\n/g, '<br>')}</p>`
    : '';

  const subject = `Secure document request: ${payload.documentTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p>Hi ${escapeHtml(safeName)},</p>
      <p>Our team has requested a document from you. Because this is sensitive information, please upload it only through your secure client dashboard and do not reply with the attachment over email.</p>
      <p><strong>Requested document:</strong> ${escapeHtml(payload.documentTitle)}</p>
      ${serviceLine}
      <p><strong>Due date:</strong> ${escapeHtml(dueText)}</p>
      ${noteLine}
      <p>You can upload the file here: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>If you have questions, reply to this email without attaching the document.</p>
    </div>
  `;
  const text = [
    `Hi ${safeName},`,
    '',
    'Our team has requested a document from you. Because this is sensitive information, please upload it only through your secure client dashboard and do not reply with the attachment over email.',
    '',
    `Requested document: ${payload.documentTitle}`,
    payload.serviceType ? `Related service: ${payload.serviceType}` : '',
    `Due date: ${dueText}`,
    payload.requestNote ? `Instructions: ${payload.requestNote}` : '',
    `Upload here: ${loginUrl}`,
    '',
    'If you have questions, reply to this email without attaching the document.',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Resend email send failed');
  }
  return { provider: 'resend', providerMessageId: data?.id ?? null };
}

async function sendViaWebhook(to: string, subject: string, html: string, text: string, payload: DocumentRequestPayload) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (MAIL_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${MAIL_WEBHOOK_TOKEN}`;
  const res = await fetch(MAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: MAIL_FROM_EMAIL,
      to,
      subject,
      html,
      text,
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
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

  const { subject, html, text } = buildMessage(payload);

  try {
    let result;
    if (RESEND_API_KEY) {
      result = await sendViaResend(payload.clientEmail, subject, html, text);
    } else if (MAIL_WEBHOOK_URL) {
      result = await sendViaWebhook(payload.clientEmail, subject, html, text, payload);
    } else {
      return json({ error: 'No mail provider configured. Set RESEND_API_KEY or MAIL_WEBHOOK_URL.' }, 500);
    }

    return json({
      ok: true,
      requestId: payload.requestId,
      emailSubject: subject,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('send-document-request-email failed:', err);
    return json({
      error: err instanceof Error ? err.message : 'Email send failed',
      requestId: payload.requestId,
    }, 502);
  }
});
