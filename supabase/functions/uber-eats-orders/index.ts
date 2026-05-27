// Uber Eats Orders & Reports proxy
// Fetches orders and daily summary for a given store_id

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const UBER_API = 'https://api.uber.com/v1'
const STORE_ID = Deno.env.get('UBER_EATS_STORE_ID') ?? ''

async function getToken(supabaseUrl: string, serviceKey: string): Promise<string> {
  const res = await fetch(`${supabaseUrl}/functions/v1/uber-eats-token`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Could not retrieve Uber token')
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint') ?? 'orders'
    const storeId = url.searchParams.get('store_id') ?? STORE_ID

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'store_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = await getToken(supabaseUrl, serviceKey)
    const authHeader = { 'Authorization': `Bearer ${token}` }

    let uberRes: Response
    let result: unknown

    switch (endpoint) {
      case 'orders': {
        // Recent orders for the store
        uberRes = await fetch(
          `${UBER_API}/eats/stores/${storeId}/orders?limit=50`,
          { headers: authHeader }
        )
        result = await uberRes.json()
        break
      }

      case 'summary': {
        // Daily order summary (last 30 days)
        const today = new Date()
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        const from = thirtyDaysAgo.toISOString().slice(0, 10)
        const to = today.toISOString().slice(0, 10)
        uberRes = await fetch(
          `${UBER_API}/eats/report/orders?store_uuid=${storeId}&start_date=${from}&end_date=${to}`,
          { headers: authHeader }
        )
        result = await uberRes.json()
        break
      }

      case 'store': {
        // Store details / status
        uberRes = await fetch(
          `${UBER_API}/eats/stores/${storeId}`,
          { headers: authHeader }
        )
        result = await uberRes.json()
        break
      }

      case 'menu': {
        // Current menu
        uberRes = await fetch(
          `${UBER_API}/eats/stores/${storeId}/menus`,
          { headers: authHeader }
        )
        result = await uberRes.json()
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Log to supabase for audit
    await supabase.from('uber_eats_log').insert({
      endpoint,
      store_id: storeId,
      status: uberRes?.status ?? 0,
      fetched_at: new Date().toISOString(),
    }).then(() => {})  // fire-and-forget

    return new Response(JSON.stringify(result), {
      status: uberRes?.status ?? 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('uber-eats-orders error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
