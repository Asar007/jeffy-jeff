// Supabase Edge Function — Razorpay payment signature verification
//
// Deploy:
//   supabase functions deploy verify-razorpay-payment --no-verify-jwt
//
// Required secrets (shared with create-razorpay-order):
//   supabase secrets set RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
//
// After deploying, copy the invoke URL into payment.html → VERIFY_PAYMENT_URL.
//
// Razorpay signs every successful payment with HMAC-SHA256 over
//   `${razorpay_order_id}|${razorpay_payment_id}` using KEY_SECRET.
// This function recomputes the HMAC and rejects any mismatch, so a client
// cannot fake a successful payment by calling completePayment() directly.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RAZORPAY_KEY_SECRET) {
    return json({ error: 'RAZORPAY_KEY_SECRET not configured' }, 500);
  }

  let payload: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    client_email?: string;
    amount?: number;
    method?: string;
    items?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return json({ error: 'Missing razorpay_payment_id, razorpay_order_id, or razorpay_signature' }, 400);
  }

  const expected = await hmacSha256Hex(
    RAZORPAY_KEY_SECRET,
    `${razorpay_order_id}|${razorpay_payment_id}`,
  );

  if (!timingSafeEqual(expected, razorpay_signature)) {
    console.warn('Signature mismatch for order', razorpay_order_id);
    return json({ verified: false, error: 'Signature mismatch' }, 400);
  }

  // Signature is valid — upsert the payment row server-side so the browser
  // can't forge a record that skips this function.
  if (SUPABASE_URL && SERVICE_ROLE_KEY && payload.client_email && payload.amount) {
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { error } = await sb.from('payments').insert([{
        client_email: payload.client_email,
        txn_id: razorpay_payment_id,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        method: payload.method ?? null,
        amount: payload.amount,
        currency: 'INR',
        status: 'captured',
        provider: 'razorpay',
        items: payload.items ?? [],
      }]);
      if (error) console.warn('Payment insert failed (non-fatal):', error.message);
    } catch (err) {
      console.warn('Payment insert exception (non-fatal):', err);
    }
  }

  return json({ verified: true, razorpay_payment_id, razorpay_order_id });
});
