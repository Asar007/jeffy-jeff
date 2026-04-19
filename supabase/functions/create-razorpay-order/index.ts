// Supabase Edge Function — Razorpay order creation
//
// Deploy:
//   supabase functions deploy create-razorpay-order --no-verify-jwt
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets, or CLI):
//   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
//   supabase secrets set RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
//
// After deploying, copy the invoke URL into payment.html → CREATE_ORDER_URL.
//
// This function creates a Razorpay order server-side so the browser never
// sees KEY_SECRET. It returns { order_id, amount, currency } that Checkout.js
// uses to open the payment modal. Signature verification for the resulting
// payment should happen in a separate webhook function (see verify-razorpay-payment).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return json({ error: 'Razorpay keys not configured on server' }, 500);
  }

  let payload: { amount?: number; currency?: string; email?: string; receipt?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'amount (in paise) is required and must be > 0' }, 400);
  }

  const receipt = payload.receipt ?? `rcpt_${Date.now()}`;
  const currency = payload.currency ?? 'INR';

  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: payload.email ? { client_email: payload.email } : undefined,
    }),
  });

  const data = await rzpRes.json();
  if (!rzpRes.ok) {
    console.error('Razorpay order error:', data);
    return json({ error: data?.error?.description ?? 'Razorpay order creation failed' }, rzpRes.status);
  }

  return json({
    order_id: data.id,
    amount: data.amount,
    currency: data.currency,
    key_id: RAZORPAY_KEY_ID,
  });
});
