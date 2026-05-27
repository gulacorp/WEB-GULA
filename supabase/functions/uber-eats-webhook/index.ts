// Uber Eats Webhook receiver
// Receives real-time order events and stores them in Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-uber-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    const eventType = payload.event_type ?? payload.type ?? 'unknown'

    console.log('Uber webhook received:', eventType, JSON.stringify(payload).slice(0, 200))

    // Persist raw event
    const { error } = await supabase.from('uber_eats_events').insert({
      event_type: eventType,
      payload,
      received_at: new Date().toISOString(),
    })

    if (error) console.error('Failed to save webhook event:', error)

    // Handle specific event types
    switch (eventType) {
      case 'orders.scheduled':
      case 'orders.order_placed':
      case 'orders.order_fulfilled': {
        const order = payload.order ?? payload
        await supabase.from('uber_eats_orders').upsert({
          uber_order_id: order.id ?? order.order_id,
          store_id: order.store?.id ?? order.store_id,
          status: order.current_state ?? eventType,
          total_price: order.cart?.total_price?.total_amount ?? 0,
          currency: order.cart?.total_price?.currency_code ?? 'EUR',
          items: order.cart?.items ?? [],
          customer_name: order.delivery?.destination?.personal_details?.first_name ?? null,
          placed_at: order.placed_at ?? new Date().toISOString(),
          raw: order,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'uber_order_id' })
        break
      }

      case 'orders.cancel_order': {
        const orderId = payload.order_id ?? payload.order?.id
        if (orderId) {
          await supabase.from('uber_eats_orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('uber_order_id', orderId)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
