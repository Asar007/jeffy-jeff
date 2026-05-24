import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

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
      event: string;
      email?: string;
      contactId?: string;
      payload?: Record<string, any>;
    };

    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { event, email, contactId, payload } = body;

    if (!event || (!email && !contactId)) {
      return json({ error: 'event and (email or contactId) are required' }, 400);
    }

    try {
      const res = await fetch('https://api.resend.com/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: event,
          email: email,
          contactId: contactId,
          data: payload || {},
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Resend event fire failed');
      }

      return json({ ok: true, id: data.id });
    } catch (err) {
      console.error('resend-events (Resend call) failed:', err);
      return json({ error: err instanceof Error ? err.message : 'Event provider failed' }, 502);
    }
  } catch (err) {
    console.error('resend-events (Global) crash:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500);
  }
});
