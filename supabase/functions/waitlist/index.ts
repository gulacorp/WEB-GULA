// Supabase Edge Function for waitlist submission
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Ya estás en la lista de espera' 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert into waitlist
    const { data, error } = await supabase
      .from('waitlist')
      .insert({ email })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: 'Failed to add to waitlist' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Trigger email notification via send-email function
    try {
      const resendUrl = `${supabaseUrl}/functions/v1/send-email`
      await fetch(resendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'x-gula-email-secret': Deno.env.get('EMAIL_WEBHOOK_SECRET') || ''
        },
        body: JSON.stringify({
          to: email,
          type: 'waitlist',
          data: { email }
        })
      })
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
      // Don't fail the request if email fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Añadido a la lista de espera',
      id: data.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
