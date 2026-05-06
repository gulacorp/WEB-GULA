// Supabase Edge Function for sending emails via Resend
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Gula <noreply@thegulacorp.com>' // Cambia esto por tu dominio verificado en Resend

interface EmailPayload {
  to: string
  type: 'contacto' | 'franquicia' | 'club_gula'
  data: {
    nombre?: string
    email?: string
    memberCode?: string
    ciudad?: string
  }
}

serve(async (req) => {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parsear payload
    const payload: EmailPayload = await req.json()
    const { to, type, data } = payload

    if (!to || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generar contenido según el tipo
    let subject = ''
    let html = ''

    switch (type) {
      case 'contacto':
        subject = '✓ Hemos recibido tu mensaje - Gula'
        html = generateContactoEmail(data.nombre || 'Cliente')
        break
      
      case 'franquicia':
        subject = '✓ Solicitud de franquicia recibida - Gula'
        html = generateFranquiciaEmail(data.nombre || 'Futuro Franquiciado', data.ciudad)
        break
      
      case 'club_gula':
        subject = '¡Bienvenido a la CREW! Tu código de acceso - Gula'
        html = generateClubGulaEmail(data.nombre || 'Miembro', data.memberCode)
        break
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
    }

    // Enviar email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html
      })
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: result }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Templates de emails
function generateContactoEmail(nombre: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #111; color: #fff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 20px; padding: 40px; }
        .logo { font-size: 32px; font-weight: 900; color: #FF5800; text-align: center; margin-bottom: 30px; }
        h1 { color: #FF5800; font-size: 24px; }
        .btn { display: inline-block; background: #FF5800; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; margin-top: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">GULA</div>
        <h1>¡Hola ${nombre}!</h1>
        <p>Hemos recibido tu mensaje correctamente. Nuestro equipo lo revisará y te contactará en menos de 48 horas.</p>
        <p>Mientras tanto, puedes seguir disfrutando de nuestra carta:</p>
        <a href="https://thegulacorp.com/carta" class="btn">VER CARTA</a>
        <div class="footer">
          <p>The Gula Corporation</p>
          <p>marketing@thegulacorp.com</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateFranquiciaEmail(nombre: string, ciudad?: string): string {
  const ciudadText = ciudad ? ` en ${ciudad}` : ''
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #111; color: #fff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 20px; padding: 40px; }
        .logo { font-size: 32px; font-weight: 900; color: #FF5800; text-align: center; margin-bottom: 30px; }
        h1 { color: #FF5800; font-size: 24px; }
        .highlight { color: #FF5800; font-weight: 700; }
        .btn { display: inline-block; background: #FF5800; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; margin-top: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">GULA</div>
        <h1>¡Hola ${nombre}!</h1>
        <p>Hemos recibido tu solicitud de franquicia${ciudadText}.</p>
        <p>Nuestro equipo de expansión te contactará en <span class="highlight">menos de 48 horas</span> para explicarte todos los detalles.</p>
        <p>Mientras tanto, puedes conocer más sobre nosotros:</p>
        <a href="https://thegulacorp.com/franquicias" class="btn">CONOCER MÁS</a>
        <div class="footer">
          <p>The Gula Corporation - Equipo de Franquicias</p>
          <p>marketing@thegulacorp.com</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateClubGulaEmail(nombre: string, memberCode?: string): string {
  const dashboardUrl = `https://thegulacorp.com/CLUBGULA.html#dashboard?code=${memberCode || ''}`
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #111; color: #fff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 20px; padding: 40px; border: 2px solid #FF5800; }
        .logo { font-size: 32px; font-weight: 900; color: #FF5800; text-align: center; margin-bottom: 30px; }
        h1 { color: #FF5800; font-size: 24px; text-align: center; }
        .code-box { background: rgba(255, 88, 0, 0.1); border: 2px solid #FF5800; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; }
        .code { font-size: 36px; font-weight: 900; color: #FF5800; letter-spacing: 4px; }
        .btn { display: inline-block; background: #FF5800; color: #000; padding: 18px 40px; text-decoration: none; border-radius: 10px; font-weight: 900; font-size: 16px; margin-top: 20px; }
        .benefits { margin: 30px 0; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; }
        .benefits h3 { color: #FF5800; margin-bottom: 15px; }
        .benefits ul { list-style: none; padding: 0; }
        .benefits li { padding: 8px 0; color: #ddd; }
        .benefits li:before { content: "✓ "; color: #FF5800; font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">GULA CREW</div>
        <h1>¡Bienvenido a la CREW, ${nombre}!</h1>
        <p style="text-align: center; color: #ccc;">Ya eres parte de nuestra familia. Aquí tienes tu código único de acceso:</p>
        
        <div class="code-box">
          <p style="margin: 0 0 10px 0; color: #888; font-size: 14px;">TU CÓDIGO DE MIEMBRO</p>
          <div class="code">${memberCode || 'GULA-XXXXXX'}</div>
        </div>
        
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="btn">ACCEDER A MI DASHBOARD</a>
        </div>
        
        <div class="benefits">
          <h3>Tus beneficios incluyen:</h3>
          <ul>
            <li>20% OFF en tu próxima compra</li>
            <li>Puntos por cada visita</li>
            <li>Acceso a eventos exclusivos</li>
            <li>Misiones semanales con recompensas</li>
            <li>Canal privado de WhatsApp</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Guarda este email. Tu código es necesario para acceder a tu dashboard.</p>
          <p>The Gula Corporation</p>
        </div>
      </div>
    </body>
    </html>
  `
}
