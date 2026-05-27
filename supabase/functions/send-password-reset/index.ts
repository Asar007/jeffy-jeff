import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM_EMAIL = Deno.env.get('MAIL_FROM_EMAIL') ?? 'NRI Bridge India <noreply@nribridgeindia.com>';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://nribridgeindia.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function buildEmailHtml(resetUrl: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f2efe5; font-family:'Helvetica Neue',Arial,sans-serif; color:#2a2a2a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2efe5; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px; background:#ffffff; border-radius:12px; padding:40px; box-shadow:0 6px 24px rgba(0,0,0,0.06);">
          <tr><td>
            <h1 style="margin:0 0 16px; font-family:Georgia,serif; color:#4a6a2e; font-size:24px;">Reset your NRI Bridge India password</h1>
            <p style="margin:0 0 16px; font-size:15px; line-height:1.55; color:#3a3a3a;">
              We received a request to reset the password for your NRI Bridge India account. Click the button below to choose a new password.
            </p>
            <p style="margin:32px 0;">
              <a href="${resetUrl}"
                 style="background:#4a6a2e; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block; font-size:15px;">
                Reset Password
              </a>
            </p>
            <p style="margin:0 0 8px; font-size:13px; color:#666;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email &mdash; your password will not change.
            </p>
            <hr style="border:none; border-top:1px solid #e5e2d8; margin:32px 0;">
            <p style="margin:0 0 4px; font-size:12px; color:#999;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0; font-size:12px; color:#4a6a2e; word-break:break-all;">${resetUrl}</p>
          </td></tr>
        </table>
        <p style="margin:24px 0 0; font-size:12px; color:#999;">
          NRI Bridge India &middot; <a href="${SITE_URL}" style="color:#4a6a2e; text-decoration:none;">nribridgeindia.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(resetUrl: string) {
  return `Reset your NRI Bridge India password

We received a request to reset the password for your account.

Reset your password using this link (expires in 1 hour):
${resetUrl}

If you didn't request a password reset, you can ignore this email — your password will not change.

NRI Bridge India
${SITE_URL}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    // Verify the caller presents our project's anon key. This is the same
    // gate other public Edge Functions use; it stops anonymous internet
    // scrapers but does not prevent an attacker who has the anon key (it's
    // shipped in client JS). Per-email rate limiting below provides the
    // actual abuse protection.
    const authHeader = req.headers.get('Authorization') || '';
    const apikey = req.headers.get('apikey') || '';
    const presented = apikey || authHeader.replace(/^Bearer\s+/i, '');
    if (!SUPABASE_ANON_KEY || presented !== SUPABASE_ANON_KEY) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: 'Supabase admin credentials not configured' }, 500);
    }
    if (!RESEND_API_KEY) {
      return json({ ok: false, error: 'RESEND_API_KEY not configured' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = body.email;
    if (typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
      return json({ ok: false, error: 'Valid email required' }, 400);
    }
    const email = rawEmail.trim().toLowerCase();

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Per-email rate limit (1/min, 5/hour) enforced in Postgres. We still
    // return a generic success response when throttled so attackers can't
    // tell registered emails from unregistered ones.
    const { data: allowed, error: rlErr } = await admin.rpc('check_password_reset_rate_limit', { p_email: email });
    if (rlErr) {
      console.error('rate-limit check failed');
      return json({ ok: false, error: 'Internal error' }, 500);
    }
    if (!allowed) {
      return json({ ok: true });
    }

    // generateLink succeeds only for existing users. We deliberately return
    // a generic success response either way so callers can't enumerate emails.
    const { data, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });

    if (linkErr || !data || !data.properties || !data.properties.hashed_token) {
      // VULN-006 FIXED: Removed email from logs
      console.log('generateLink miss (user not found or internal error)');
      return json({ ok: true });
    }

    const tokenHash = data.properties.hashed_token;
    const resetUrl = `${SITE_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM_EMAIL,
        to: [email],
        subject: 'Reset your NRI Bridge India password',
        html: buildEmailHtml(resetUrl),
        text: buildEmailText(resetUrl),
      }),
    });

    if (!res.ok) {
      // Log generic error
      console.error('Resend send failed');
      return json({ ok: false, error: 'Failed to send email' }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    // VULN-006 FIXED: Generic error logging
    console.error('send-password-reset error');
    return json({ ok: false, error: 'Unexpected error' }, 500);
  }
});
