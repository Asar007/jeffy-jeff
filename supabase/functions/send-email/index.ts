import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL') ?? 'NRI Bridge India <notifications@nribridgeindia.com>';

// event_name -> Resend published template ID (from mail-templates/INTEGRATION.md)
const EVENT_TEMPLATE_MAP: Record<string, { templateId: string; subject: string }> = {
  'user.welcome':              { templateId: '01682539-4627-45d5-a98d-2433adb773ee', subject: 'Welcome to NRI Bridge India' },
  'billing.payment_succeeded': { templateId: 'ec1e5784-c7f7-49b2-97c9-4e45ad990723', subject: 'Payment Received - NRI Bridge India' },
  'billing.payment_failed':    { templateId: 'b1566e34-8ef6-4dc4-bd27-564e549ea2e0', subject: 'Payment Failed - Action Required' },
  'billing.upcoming':          { templateId: '6891bf36-9a8f-4695-8f45-28b19e09aade', subject: 'Upcoming Payment Reminder' },
  'billing.dispute_raised':    { templateId: '38f7cd22-756c-469c-8bbe-440f2b32388b', subject: 'Dispute Received - NRI Bridge India' },
  'dispute.status_update':     { templateId: '1b516385-6f55-4037-af41-fb99374195a9', subject: 'Dispute Update - NRI Bridge India' },
  'document.request':          { templateId: 'd4ab1f99-1330-479b-9367-253ce85ad048', subject: 'Document Request - NRI Bridge India' },
  'document.accepted':         { templateId: '1f0c0aca-df73-4727-870a-9f1c29571083', subject: 'Document Accepted - NRI Bridge India' },
  'document.status_update':    { templateId: '21ea274b-69b2-4301-9db9-4259e43808a7', subject: 'Document Update - NRI Bridge India' },
  'request.submitted':         { templateId: '980b3756-b29e-4339-96f3-5fc2c7c9f710', subject: 'Service Request Received' },
  'request.status_update':     { templateId: 'e0f23ac8-04a2-4408-8dc6-6ff5fa6de6e5', subject: 'Service Request Update' },
  'task.update':               { templateId: '20737c37-dd98-4dbb-845d-e72a7d3b92e9', subject: 'Service Update - NRI Bridge India' },
  // Aliases — DB triggers emit these legacy names; keep mappings until migration consolidates them.
  'billing.request_submitted':      { templateId: '980b3756-b29e-4339-96f3-5fc2c7c9f710', subject: 'Service Request Received' },
  'billing.request_status_update':  { templateId: 'e0f23ac8-04a2-4408-8dc6-6ff5fa6de6e5', subject: 'Service Request Update' },
  'billing.document_accepted':      { templateId: '1f0c0aca-df73-4727-870a-9f1c29571083', subject: 'Document Accepted - NRI Bridge India' },
  'billing.document_status_update': { templateId: '21ea274b-69b2-4301-9db9-4259e43808a7', subject: 'Document Update - NRI Bridge India' },
  'billing.dispute_status_update':  { templateId: '1b516385-6f55-4037-af41-fb99374195a9', subject: 'Dispute Update - NRI Bridge India' },
  'billing.task_update':            { templateId: '20737c37-dd98-4dbb-845d-e72a7d3b92e9', subject: 'Service Update - NRI Bridge India' },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Missing Authorization header' }, 401);
    }

    if (!RESEND_API_KEY) {
      return json({ ok: false, error: 'RESEND_API_KEY is not configured in Supabase Secrets' });
    }

    const body = await req.json().catch(() => ({}));

    // Support both direct calls and Supabase Webhooks (body.record)
    const data = body.record || body;

    const eventName: string | undefined = data.event || data.event_name;
    const recipient = data.to || data.email || data.recipient_email;
    const payload = data.payload || data.data || {};
    let templateId: string | undefined = data.templateId || data.template_id;
    let subject: string | undefined = data.subject;
    const html: string | undefined = data.html;
    const text: string | undefined = data.text;

    // Resolve event_name -> templateId
    if (!templateId && eventName) {
      const mapped = EVENT_TEMPLATE_MAP[eventName];
      if (!mapped) {
        return json({
          ok: false,
          error: `Unknown event_name: ${eventName}`,
          known_events: Object.keys(EVENT_TEMPLATE_MAP),
        });
      }
      templateId = mapped.templateId;
      subject = subject || mapped.subject;
    }

    if (!recipient) {
      return json({ ok: false, error: 'Recipient email is missing' });
    }
    if (!templateId && !html && !text) {
      return json({ ok: false, error: 'No templateId/event_name/html/text provided' });
    }

    const finalSubject = subject || 'Update from NRI Bridge India';
    const toArray = Array.isArray(recipient) ? recipient : [recipient];

    const resendBody: Record<string, unknown> = templateId
      ? {
          from: MAIL_FROM_EMAIL,
          to: toArray,
          subject: finalSubject,
          template: { id: templateId, variables: payload },
        }
      : {
          from: MAIL_FROM_EMAIL,
          to: toArray,
          subject: finalSubject,
          ...(html ? { html } : {}),
          ...(text ? { text } : {}),
        };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    const resText = await res.text();
    let resData: unknown;
    try { resData = JSON.parse(resText); } catch { resData = resText; }

    if (!res.ok) {
      // Log full error details to function logs (secure)
      console.error('Resend API rejected the request', {
        status: res.status,
        resend_response: resData,
        // Avoid logging full payload if it contains sensitive user data, 
        // but here it's necessary for debugging. Function logs are usually restricted.
      });

      // Return sanitized error to client
      return json({
        ok: false,
        error: 'Resend API rejected the request',
        resend_status: res.status,
      });
    }

    return json({ ok: true });
  } catch (err) {
    console.error('send-email (Global) crash:', err);
    return json({
      ok: false,
      error: 'Function Internal Error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});
