import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL') ?? 'NRI Bridge India <notifications@nribridgeindia.com>';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 200, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY is not configured' }, 500);
    }

    let body: {
      to: string;
      templateId: string;
      subject?: string;
      payload?: Record<string, any>;
    };

    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { to, templateId, subject, payload } = body;

    if (!to || !templateId) {
      return json({ error: 'to and templateId are required' }, 400);
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: MAIL_FROM_EMAIL,
          to: [to],
          subject: subject || 'Notification from NRI Bridge India',
          template: {
            id: templateId,
            variables: payload || {},
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Resend email send failed');
      }

      return json({ ok: true, id: data.id });
    } catch (err) {
      console.error('send-email (Resend call) failed:', err);
      return json({ error: err instanceof Error ? err.message : 'Email provider failed' }, 502);
    }
  } catch (err) {
    console.error('send-email (Global) crash:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500);
  }
});
