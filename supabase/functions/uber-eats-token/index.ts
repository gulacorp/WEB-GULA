// Uber Eats OAuth2 token manager — client credentials flow
// Caches token in Supabase KV to avoid hitting Uber rate limits

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const UBER_TOKEN_URL = 'https://auth.uber.com/oauth/v2/token'
const UBER_CLIENT_ID = Deno.env.get('UBER_EATS_CLIENT_ID') ?? ''
const UBER_CLIENT_SECRET = Deno.env.get('UBER_EATS_CLIENT_SECRET') ?? ''
const UBER_SCOPES = 'eats.deliveries eats.store.orders.read eats.report'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check cached token
    const { data: cached } = await supabase
      .from('uber_eats_tokens')
      .select('access_token, expires_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = Date.now()
    if (cached && new Date(cached.expires_at).getTime() > now + 60_000) {
      return new Response(JSON.stringify({ access_token: cached.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch new token
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: UBER_CLIENT_ID,
      client_secret: UBER_CLIENT_SECRET,
      scope: UBER_SCOPES,
    })

    const tokenRes = await fetch(UBER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Uber token error:', err)
      return new Response(JSON.stringify({ error: 'Failed to get Uber token', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = await tokenRes.json()
    const expiresAt = new Date(now + token.expires_in * 1000).toISOString()

    // Cache token
    await supabase.from('uber_eats_tokens').insert({
      access_token: token.access_token,
      expires_at: expiresAt,
      scope: token.scope ?? UBER_SCOPES,
    })

    return new Response(JSON.stringify({ access_token: token.access_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('uber-eats-token error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
