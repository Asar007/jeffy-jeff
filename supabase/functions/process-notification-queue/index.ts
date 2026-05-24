import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS_HEADERS });
    }

    // 1. Fetch pending notifications
    const { data: queue, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(10); // Batch process

    if (fetchError) throw fetchError;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ message: 'Queue empty' }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const results = [];

    for (const item of queue) {
      try {
        // Mark as processing
        await supabase.from('notification_queue').update({ status: 'processing' }).eq('id', item.id);

        // 2. Call Resend API
        const res = await fetch('https://api.resend.com/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: item.event_name,
            email: item.recipient_email,
            data: item.payload,
          }),
        });

        const resData = await res.json();

        if (res.ok) {
          await supabase.from('notification_queue').update({ 
            status: 'sent', 
            processed_at: new Date().toISOString() 
          }).eq('id', item.id);
          results.push({ id: item.id, status: 'success' });
        } else {
          throw new Error(resData.message || 'Resend API error');
        }
      } catch (err) {
        console.error(`Failed to process item ${item.id}:`, err);
        await supabase.from('notification_queue').update({ 
          status: 'failed', 
          error_msg: err instanceof Error ? err.message : 'Unknown error' 
        }).eq('id', item.id);
        results.push({ id: item.id, status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({ processed: queue.length, results }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Processor crash:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
