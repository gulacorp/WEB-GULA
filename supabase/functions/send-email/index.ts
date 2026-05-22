// Supabase Edge Function for sending emails via Resend
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { wrapEmail } from './styles.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev' // Fallback: usa onboarding@resend.dev mientras thegulacorp.com NO esté verificado en Resend. Una vez verificado el dominio, cambiar a marketing@thegulacorp.com
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'marketing@thegulacorp.com'
const EMAIL_WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gula-email-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Rate limiting: max 5 requests per IP per minute
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')?.trim()
    || 'unknown'
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, maxLen).trim()
}

interface EmailPayload {
  to: string
  type: 'contacto' | 'franquicia' | 'club_gula' | 'pedido'
  data: {
    nombre?: string
    email?: string
    memberCode?: string
    ciudad?: string
    telefono?: string
    tipo?: string
    mensaje?: string
    total?: number
    puntos?: number
    items?: Array<{ name?: string; title?: string; qty?: number; quantity?: number; price?: number }>
  }
}

serve(async (req) => {
  try {
    // Validar método
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (EMAIL_WEBHOOK_SECRET && req.headers.get('x-gula-email-secret') !== EMAIL_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Rate limit check
    const clientIP = getClientIP(req)
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Payload size guard (1 MB max)
    const contentLength = Number(req.headers.get('content-length') || '0')
    if (contentLength > 1_048_576) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parsear payload
    const payload: EmailPayload = await req.json()
    const { to, type, data } = payload

    if (!to || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate destination email
    if (!isValidEmail(to)) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sanitize data inputs
    const safeData = {
      nombre: clampString(data?.nombre, 100),
      email: clampString(data?.email, 255),
      memberCode: clampString(data?.memberCode, 50),
      ciudad: clampString(data?.ciudad, 100),
      telefono: clampString(data?.telefono, 50),
      tipo: clampString(data?.tipo, 50),
      mensaje: clampString(data?.mensaje, 2000),
      total: typeof data?.total === 'number' ? data.total : undefined,
      puntos: typeof data?.puntos === 'number' ? data.puntos : undefined,
      items: Array.isArray(data?.items)
        ? data.items.slice(0, 50).map((item) => ({
            name: clampString(item.name || item.title, 100),
            qty: Number(item.qty || item.quantity || 1),
            price: Number(item.price || 0),
          }))
        : [],
    }

    // Generar contenido según el tipo
    let subject = ''
    let html = ''

    switch (type) {
      case 'contacto':
        subject = '✓ Hemos recibido tu mensaje - Gula'
        html = generateContactoEmail(safeData.nombre || 'Cliente')
        await notifyAdmin('Nuevo contacto web', safeData)
        break

      case 'franquicia':
        subject = '✓ Solicitud de franquicia recibida - Gula'
        html = generateFranquiciaEmail(safeData.nombre || 'Futuro Franquiciado', safeData.ciudad)
        await notifyAdmin('Nueva solicitud de franquicia', safeData)
        break

      case 'club_gula':
        subject = '¡Bienvenido a la CREW! Tu código de acceso - Gula'
        html = generateClubGulaEmail(safeData.nombre || 'Miembro', safeData.memberCode)
        await notifyAdmin('Nuevo registro Club GULA', safeData)
        break

      case 'pedido':
        subject = '✓ Pedido confirmado - GULA'
        html = generatePedidoEmail(safeData.nombre || 'Miembro CREW', safeData.total, safeData.puntos, safeData.items)
        await notifyAdmin('Nuevo pedido web', safeData)
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
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

async function notifyAdmin(subject: string, data: EmailPayload['data']) {
  if (!ADMIN_EMAIL || !RESEND_API_KEY) return
  const rows = Object.entries(data || {}).map(([key, value]) => {
    const rendered = Array.isArray(value) ? JSON.stringify(value) : String(value ?? '-')
    return `<tr><td style="padding:8px;border-bottom:1px solid #333;color:#FF5800">${escapeHtml(key)}</td><td style="padding:8px;border-bottom:1px solid #333;color:#fff">${escapeHtml(rendered)}</td></tr>`
  }).join('')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[GULA Admin] ${subject}`,
      html: wrapEmail(`<h1>${escapeHtml(subject)}</h1><table class="gula-table">${rows}</table>`, { title: 'GULA Admin', noHeader: true })
    })
  }).catch((error) => console.error('Admin email error:', error))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

// Templates de emails (usan CSS global de styles.ts)
function generateContactoEmail(nombre: string): string {
  return wrapEmail(`
    <div class="gula-logo">GULA</div>
    <h1>¡Hola ${nombre}!</h1>
    <p>Hemos recibido tu mensaje correctamente. Nuestro equipo lo revisará y te contactará en menos de 48 horas.</p>
    <p>Mientras tanto, puedes seguir disfrutando de nuestra carta:</p>
    <div class="center"><a href="https://thegulacorp.com/carta" class="gula-btn-alt">VER CARTA</a></div>
  `, { title: 'GULA - Contacto', noHeader: true })
}

function generateFranquiciaEmail(nombre: string, ciudad?: string): string {
  const ciudadText = ciudad ? ` en ${ciudad}` : ''
  return wrapEmail(`
    <div class="gula-logo">GULA</div>
    <h1>¡Hola ${nombre}!</h1>
    <p>Hemos recibido tu solicitud de franquicia${ciudadText}.</p>
    <p>Nuestro equipo de expansión te contactará en <span class="gula-highlight">menos de 48 horas</span> para explicarte todos los detalles.</p>
    <p>Mientras tanto, puedes conocer más sobre nosotros:</p>
    <div class="center"><a href="https://thegulacorp.com/franquicias" class="gula-btn-alt">CONOCER MÁS</a></div>
  `, { title: 'GULA - Franquicia', noHeader: true })
}

function generateClubGulaEmail(nombre: string, memberCode?: string): string {
  const dashboardUrl = `https://thegulacorp.com/CLUBGULA.html#dashboard?code=${memberCode || ''}`
  return wrapEmail(`
    <h1 style="text-align:center">¡Bienvenido a la CREW, ${nombre}!</h1>
    <p class="center" style="color:#ccc">Ya eres parte de nuestra familia. Aquí tienes tu código único de acceso:</p>

    <div class="gula-code-box">
      <p style="margin:0 0 10px 0;color:#888;font-size:14px">TU CÓDIGO DE MIEMBRO</p>
      <div class="gula-code">${memberCode || 'GULA-XXXXXX'}</div>
    </div>

    <div class="center"><a href="${dashboardUrl}" class="gula-btn">ACCEDER A MI DASHBOARD</a></div>

    <div class="gula-card">
      <h3>Tus beneficios incluyen:</h3>
      <ul>
        <li>20% OFF en tu próxima compra</li>
        <li>Puntos por cada visita</li>
        <li>Acceso a eventos exclusivos</li>
        <li>Misiones semanales con recompensas</li>
        <li>Canal privado de WhatsApp</li>
      </ul>
    </div>

    <p class="center" style="color:#888;font-size:12px">Guarda este email. Tu código es necesario para acceder a tu dashboard.</p>
  `, { title: 'Bienvenido a la CREW', header: 'GULA CREW' })
}

function generatePedidoEmail(nombre: string, total?: number, puntos?: number, items: Array<{ name?: string; title?: string; qty?: number; quantity?: number; price?: number }> = []): string {
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #333;color:#fff">${escapeHtml(item.name || item.title || 'Producto')}</td>
      <td style="padding:10px;border-bottom:1px solid #333;color:#ccc;text-align:center">${item.qty || item.quantity || 1}</td>
      <td style="padding:10px;border-bottom:1px solid #333;color:#FF5800;text-align:right">${Number(item.price || 0).toFixed(2)}€</td>
    </tr>
  `).join('')
  return wrapEmail(`
    <h1 style="text-align:center">Pedido confirmado, ${escapeHtml(nombre)}</h1>
    <p class="center" style="color:#ccc">Hemos recibido tu pedido correctamente.</p>

    <div class="gula-total-box">
      <div class="gula-total">${Number(total || 0).toFixed(2)}€</div>
      <div style="color:#ccc;margin-top:8px">+${Number(puntos || 0)} puntos CREW</div>
    </div>

    <table class="gula-table">${itemRows}</table>
  `, { title: 'Pedido confirmado - GULA', header: 'GULA' })
}
