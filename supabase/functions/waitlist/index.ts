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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .single()

    // Always send email notification via Resend API directly
    try {
      console.log('Sending email to:', email)
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'marketing@thegulacorp.com'
      const fechaCreacion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      
      console.log('RESEND_API_KEY exists:', !!resendApiKey)
      console.log('FROM_EMAIL:', fromEmail)
      
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
      } else {
        // Email to user
        const emailPayload = {
          from: fromEmail,
          to: email,
          subject: 'Estas dentro. — GULA CREW',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 40px 20px; background: #000; }
                .container { max-width: 500px; margin: 0 auto; background: linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 80%, #000 100%); border-radius: 30px; overflow: hidden; box-shadow: 0 0 60px rgba(255,88,0,0.2); }
                .header { padding: 50px 30px 30px; text-align: center; }
                .hero { padding: 30px; text-align: center; position: relative; overflow: hidden; }
                .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 50%, rgba(255,88,0,0.12) 0%, transparent 70%); }
                .hero-title { font-size: 42px; font-weight: 900; color: #FF5800; letter-spacing: 1px; line-height: 1.1; margin: 0 0 15px 0; text-transform: uppercase; position: relative; }
                .hero-subtitle { font-size: 16px; color: #fff; letter-spacing: 0.5px; margin: 0; position: relative; opacity: 0.9; }
                .card { background: linear-gradient(135deg, rgba(255,88,0,0.08) 0%, rgba(255,88,0,0.03) 100%); border: 1px solid rgba(255,88,0,0.25); border-radius: 25px; padding: 30px; margin: 20px 30px; position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,88,0,0.08) 0%, transparent 60%); }
                .card-content { position: relative; z-index: 1; text-align: center; }
                .card-label { font-size: 10px; font-weight: 700; color: #FF5800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
                .card-title { font-size: 20px; font-weight: 900; color: #fff; letter-spacing: 0.5px; line-height: 1.4; margin: 0 0 12px 0; }
                .card-text { font-size: 14px; color: #ccc; line-height: 1.8; margin: 0; }
                .cta-container { text-align: center; padding: 30px; }
                .slogan { font-size: 12px; color: #FF5800; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
                .cta-btn { display: inline-block; padding: 16px 45px; background: linear-gradient(135deg, #FF5800 0%, #FF7A29 100%); color: #000; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 8px 35px rgba(255,88,0,0.4); transition: all 0.3s ease; }
                .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 45px rgba(255,88,0,0.5); }
                .footer { padding: 25px 30px 40px; text-align: center; background: #000; }
                .footer-logo { margin-top: 20px; }
                .footer-text { font-size: 11px; color: #666; letter-spacing: 1px; margin: 5px 0; }
                
                @media (prefers-color-scheme: light) {
                  body { background: #f0f0f0; }
                  .container { background: linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%); box-shadow: 0 0 60px rgba(255,88,0,0.15); }
                  .hero-title { color: #FF5800; }
                  .hero-subtitle { color: #333; }
                  .card { background: linear-gradient(135deg, rgba(255,88,0,0.06) 0%, rgba(255,88,0,0.02) 100%); border: 1px solid rgba(255,88,0,0.18); }
                  .card-title { color: #000; }
                  .card-text { color: #555; }
                  .footer { background: #fff; }
                  .footer-text { color: #888; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://thegulacorp.com/images/logo" alt="GULA" style="height: 70px; width: auto; max-width: 250px;">
                </div>
                
                <div class="hero">
                  <h2 class="hero-title">YA ESTÁS<br/>DENTRO</h2>
                  <p class="hero-subtitle">Bienvenido a la lista de espera exclusiva</p>
                </div>
                
                <div class="card">
                  <div class="card-content">
                    <div class="card-label">LISTA DE ESPERA</div>
                    <h3 class="card-title">Cuando GULA CREW abra sus puertas, tú serás el primero</h3>
                    <p class="card-text" style="margin-top: 12px; color: #FF5800; font-weight: 600;">${fechaCreacion}</p>
                  </div>
                </div>
                
                <div class="card">
                  <div class="card-content">
                    <div class="card-label">¿QUE ES EL CLUB GULA?</div>
                    <p class="card-text">
                      <strong style="color: #FF5800;">COMES</strong> Productazo. Todo empieza aqui<br/>
                      <strong style="color: #FF5800;">VUELVES</strong> La recurrencia tiene ventajas. Productos exclusivos, drops y beneficios<br/>
                      <strong style="color: #FF5800;">PARTICIPAS</strong> La CREW construye el sistema. Acceso anticipado, decisiones, eventos para miembros y recompensas high level
                    </p>
                  </div>
                </div>
                
                <div class="card">
                  <div class="card-content">
                    <div class="card-label">MIENTRAS TANTO</div>
                    <p class="card-text">Mientras ultimamos detalles para que el Club Gula sea algo verdaderamente diferente, aqui tienes la carta. Come bien, Come Gula, cuando este disponible llevaras ventaja.</p>
                  </div>
                </div>
                
                <div class="cta-container">
                  <p class="slogan">pecar nos hace humanos</p>
                  <a href="https://thegulacorp.com/marketplace.html" class="cta-btn">VER LA CARTA</a>
                  <div class="footer-logo">
                    <img src="https://thegulacorp.com/images/logo" alt="GULA" style="height: 50px; width: auto; max-width: 180px;">
                  </div>
                </div>
                
                <div class="footer">
                  <p class="footer-text">No compartiremos tu email. Punto.</p>
                  <p class="footer-text">© 2026 GULA Corp. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `
        }
        
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify(emailPayload)
        })
        console.log('Email response status:', emailRes.status)
        const emailResponseText = await emailRes.text()
        console.log('Email response body:', emailResponseText)
        if (!emailRes.ok) {
          console.error('Email response error:', emailResponseText)
        }

        // Email to admin
        if (email !== adminEmail) {
          const adminPayload = {
            from: fromEmail,
            to: adminEmail,
            subject: 'Nueva inscripción waitlist Club GULA',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#000;color:#fff;">
                <h2 style="color:#FF5800;">Nueva inscripción waitlist</h2>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Fecha:</strong> ${fechaCreacion}</p>
              </div>
            `
          }
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify(adminPayload)
          })
        }
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
      // Don't fail the request if email fails
    }

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
