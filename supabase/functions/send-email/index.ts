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
  type: 'contacto' | 'franquicia' | 'club_gula' | 'pedido' | 'waitlist'
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
        html = generateContactoEmail(safeData.nombre || 'Cliente', safeData.email, safeData.telefono, safeData.ciudad, safeData.mensaje, safeData.tipo)
        await notifyAdmin('Nuevo contacto web', safeData)
        break

      case 'franquicia':
        subject = '✓ Solicitud de franquicia recibida - Gula'
        html = generateFranquiciaEmail(safeData.nombre || 'Futuro Franquiciado', safeData.email, safeData.telefono, safeData.ciudad, safeData.mensaje)
        await notifyAdmin('Nueva solicitud de franquicia', safeData)
        break

      case 'club_gula':
        subject = '¡Bienvenido a la CREW! Tu código de acceso - Gula'
        html = generateClubGulaEmail(safeData.nombre || 'Miembro', safeData.email, safeData.memberCode, safeData.puntos, safeData.nivel)
        await notifyAdmin('Nuevo registro Club GULA', safeData)
        break

      case 'waitlist':
        subject = '✓ Estás en la lista - GULA CREW'
        html = generateContactoEmail(safeData.nombre || 'Miembro futuro', safeData.email, '', '', safeData.mensaje || 'Te avisaremos cuando GULA CREW esté disponible', 'waitlist')
        await notifyAdmin('Nueva inscripción waitlist Club GULA', safeData)
        break

      case 'pedido':
        subject = '✓ Pedido confirmado - GULA'
        html = generatePedidoEmail(safeData.nombre || 'Miembro CREW', safeData.email, safeData.memberCode, safeData.total, safeData.puntos, safeData.items)
        await notifyAdmin('Nuevo pedido web', safeData)
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Enviar email via Resend al usuario que llenó el formulario
    const userEmail = safeData.email || to
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: userEmail,
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
  
  // No enviar email de admin si el usuario es el mismo que el admin
  if (data.email === ADMIN_EMAIL) return
  
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
function generateContactoEmail(nombre: string, email?: string, telefono?: string, ciudad?: string, mensaje?: string, tipo?: string): string {
  const tipoLabel = tipo ? tipo.toUpperCase() : 'CONTACTO'
  const fechaCreacion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  
  return wrapEmail(`
    <div class="gula-subtitle">CONFIRMACIÓN DE CONTACTO</div>
    <h1>HOLA, ${escapeHtml(nombre).toUpperCase()}</h1>
    
    <div style="background:linear-gradient(135deg, #FF5800 0%, #E64A00 100%);border-radius:20px;padding:40px;box-shadow:0 0 40px rgba(255,88,0,0.3);margin:30px 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 60%);"></div>
      <div style="position:relative;z-index:1;">
        <div style="color:#000;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:15px;">TU SOLICITUD</div>
        <div style="color:#000;font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:20px;">${tipoLabel}</div>
        <div style="color:rgba(0,0,0,0.6);font-size:13px;line-height:1.8;">
          ${email ? `<div>${escapeHtml(email)}</div>` : ''}
          ${telefono ? `<div>${escapeHtml(telefono)}</div>` : ''}
          ${ciudad ? `<div>${escapeHtml(ciudad)}</div>` : ''}
        </div>
        <div style="color:rgba(0,0,0,0.4);font-size:11px;margin-top:20px;letter-spacing:1px;">${fechaCreacion}</div>
      </div>
    </div>
    
    ${mensaje ? `
    <div class="gula-card">
      <h3>TU MENSAJE</h3>
      <p style="color:#333;line-height:1.8;font-size:1rem;">${escapeHtml(mensaje)}</p>
    </div>
    ` : ''}
    
    <div class="gula-card">
      <h3>GRACIAS POR CONTACTAR</h3>
      <p style="color:#333;line-height:1.8;">Hemos recibido tu mensaje. Nuestro equipo te contactará en menos de 48 horas.</p>
    </div>
    
    <div class="gula-divider"></div>
    <div class="center">
      <a href="https://thegulacorp.com/marketplace.html" class="gula-btn-alt">VER LA CARTA</a>
    </div>
    <div class="center" style="margin-top:20px;">
      <a href="https://www.google.com/maps/search/?api=1&query=GULA+restaurant" class="gula-btn-maps">VALORAR EN GOOGLE MAPS</a>
    </div>
    <p style="color:#666;font-size:11px;text-align:center;margin-top:40px;letter-spacing:1px;">${new Date().toISOString().slice(0,10)}</p>
  `, { title: 'GULA - Confirmación de Contacto' })
}

function generateFranquiciaEmail(nombre: string, email?: string, telefono?: string, ciudad?: string, mensaje?: string): string {
  const fechaCreacion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  
  return wrapEmail(`
    <div class="gula-subtitle">SOLICITUD DE FRANQUICIA</div>
    <h1>HOLA, ${escapeHtml(nombre).toUpperCase()}</h1>
    
    <div style="background:linear-gradient(135deg, #FF5800 0%, #E64A00 100%);border-radius:20px;padding:40px;box-shadow:0 0 40px rgba(255,88,0,0.3);margin:30px 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 60%);"></div>
      <div style="position:relative;z-index:1;">
        <div style="color:#000;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:15px;">TU INTERÉS</div>
        <div style="color:#000;font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:20px;">FRANQUICIA</div>
        <div style="color:rgba(0,0,0,0.6);font-size:13px;line-height:1.8;">
          ${email ? `<div>${escapeHtml(email)}</div>` : ''}
          ${telefono ? `<div>${escapeHtml(telefono)}</div>` : ''}
          ${ciudad ? `<div>${escapeHtml(ciudad)}</div>` : ''}
        </div>
        <div style="color:rgba(0,0,0,0.4);font-size:11px;margin-top:20px;letter-spacing:1px;">${fechaCreacion}</div>
      </div>
    </div>
    
    ${mensaje ? `
    <div class="gula-card">
      <h3>TU PROYECTO</h3>
      <p style="color:#333;line-height:1.8;font-size:1rem;">${escapeHtml(mensaje)}</p>
    </div>
    ` : ''}
    
    <div class="gula-card">
      <h3>ÚNETE A LA FAMILIA</h3>
      <p style="color:#333;line-height:1.8;">Hemos recibido tu solicitud de franquicia. Nuestro equipo de expansión te contactará en menos de 48 horas.</p>
    </div>
    
    <div class="gula-divider"></div>
    <div class="center">
      <a href="https://thegulacorp.com/marketplace.html" class="gula-btn-alt">VER LA CARTA</a>
    </div>
    <div class="center" style="margin-top:20px;">
      <a href="https://www.google.com/maps/search/?api=1&query=GULA+restaurant" class="gula-btn-maps">VALORAR EN GOOGLE MAPS</a>
    </div>
    <p style="color:#666;font-size:11px;text-align:center;margin-top:40px;letter-spacing:1px;">${new Date().toISOString().slice(0,10)}</p>
  `, { title: 'GULA - Solicitud de Franquicia' })
}

function generateClubGulaEmail(nombre: string, email?: string, memberCode?: string, puntos?: number, nivel?: string): string {
  const nombreCompleto = nombre
  const fechaCreacion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  
  return wrapEmail(`
    <div class="gula-subtitle">BIENVENIDO A LA CREW</div>
    <h1>HOLA, ${escapeHtml(nombreCompleto).toUpperCase()}</h1>
    
    <div style="background:linear-gradient(135deg, #FF5800 0%, #E64A00 100%);border-radius:20px;padding:40px;box-shadow:0 0 40px rgba(255,88,0,0.3);margin:30px 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 60%);"></div>
      <div style="position:relative;z-index:1;">
        <div style="color:#000;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:15px;">TU TARJETA DE MIEMBRO</div>
        <div style="color:#000;font-size:36px;font-weight:900;letter-spacing:3px;margin-bottom:20px;">${memberCode || 'XXXXXX'}</div>
        <div style="color:rgba(0,0,0,0.6);font-size:13px;line-height:1.8;">
          <div>${escapeHtml(nombreCompleto)}</div>
          <div>Miembro desde: ${fechaCreacion}</div>
        </div>
        ${puntos !== undefined ? `<div style="background:rgba(0,0,0,0.2);color:#000;padding:10px 25px;border-radius:25px;font-weight:900;display:inline-block;margin-top:20px;font-size:14px;letter-spacing:1px;">${puntos} PUNTOS</div>` : ''}
      </div>
    </div>
    
    <div class="gula-card">
      <h3>LA CREW ES TU FAMILIA</h3>
      <p style="color:#333;line-height:1.8;">Ya eres parte de la CREW. Acumula puntos con cada pedido, sube de nivel y desbloquea recompensas exclusivas.</p>
    </div>
    
    <div class="gula-divider"></div>
    <div class="center">
      <a href="https://thegulacorp.com/marketplace.html" class="gula-btn-alt">VER LA CARTA</a>
    </div>
    <div class="center" style="margin-top:20px;">
      <a href="https://www.google.com/maps/search/?api=1&query=GULA+restaurant" class="gula-btn-maps">VALORAR EN GOOGLE MAPS</a>
    </div>
    <p style="color:#666;font-size:11px;text-align:center;margin-top:40px;letter-spacing:1px;">${new Date().toISOString().slice(0,10)}</p>
  `, { title: 'GULA - Bienvenido a la CREW' })
}

function generatePedidoEmail(nombre: string, email?: string, memberCode?: string, total?: number, puntos?: number, items: Array<{ name?: string; title?: string; qty?: number; quantity?: number; price?: number }> = []): string {
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid rgba(255,88,0,0.15);color:#fff;font-size:1rem;">${escapeHtml(item.name || item.title || 'Producto')}</td>
      <td style="padding:18px 0;border-bottom:1px solid rgba(255,88,0,0.15);color:#ccc;text-align:center;font-size:1rem;">${item.qty || item.quantity || 1}</td>
      <td style="padding:18px 0;border-bottom:1px solid rgba(255,88,0,0.15);color:#FF5800;text-align:right;font-weight:700;font-size:1rem;">${Number(item.price || 0).toFixed(2)}€</td>
    </tr>
  `).join('')
  
  const fechaCreacion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  const horaCreacion = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const orderId = `ORD-${Date.now().toString().slice(-8)}`
  
  return wrapEmail(`
    <div class="gula-subtitle">FACTURA DE PEDIDO</div>
    <h1>HOLA, ${escapeHtml(nombre).toUpperCase()}</h1>
    
    <div style="background:#000000;border:2px solid rgba(255,88,0,0.4);border-radius:20px;padding:50px 40px;box-shadow:0 0 60px rgba(255,88,0,0.2);margin:30px 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, #FF5800, #E64A00, #FF5800);"></div>
      
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:30px;border-bottom:1px solid rgba(255,88,0,0.2);">
        <div>
          <div style="color:#FF5800;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">NÚMERO DE PEDIDO</div>
          <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:2px;">${orderId}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#FF5800;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">FECHA</div>
          <div style="color:#fff;font-size:14px;">${fechaCreacion}</div>
          <div style="color:#666;font-size:12px;margin-top:4px;">${horaCreacion}</div>
        </div>
      </div>
      
      <div style="margin-bottom:40px;">
        <div style="color:#FF5800;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:15px;">CLIENTE</div>
        <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:5px;">${escapeHtml(nombre)}</div>
        ${email ? `<div style="color:#888;font-size:13px;">${escapeHtml(email)}</div>` : ''}
        ${memberCode ? `<div style="color:#FF5800;font-size:12px;margin-top:8px;font-weight:700;">${escapeHtml(memberCode)}</div>` : ''}
      </div>
      
      ${items.length > 0 ? `
      <div style="margin-bottom:40px;">
        <div style="color:#FF5800;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">DETALLE DEL PEDIDO</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:15px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left;">Producto</th>
              <th style="padding:15px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;">Cant.</th>
              <th style="padding:15px 0;color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div style="background:linear-gradient(135deg, rgba(255,88,0,0.1) 0%, rgba(255,88,0,0.05) 100%);border:1px solid rgba(255,88,0,0.3);border-radius:15px;padding:30px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <div style="color:#888;font-size:13px;">Subtotal</div>
          <div style="color:#fff;font-size:16px;font-weight:700;">${Number(total || 0).toFixed(2)}€</div>
        </div>
        ${puntos !== undefined ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <div style="color:#888;font-size:13px;">Puntos CREW</div>
          <div style="color:#FF5800;font-size:16px;font-weight:700;">+${Number(puntos)}</div>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:20px;border-top:1px solid rgba(255,88,0,0.3);">
          <div style="color:#FF5800;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">TOTAL</div>
          <div style="color:#FF5800;font-size:32px;font-weight:900;letter-spacing:1px;">${Number(total || 0).toFixed(2)}€</div>
        </div>
      </div>
    </div>
    
    <div class="gula-card">
      <h3>TU PEDIDO ESTÁ EN CAMINO</h3>
      <p style="color:#333;line-height:1.8;">Hemos recibido tu pedido correctamente. Estamos preparando tu comida.</p>
    </div>
    
    <div class="gula-divider"></div>
    <div class="center">
      <a href="https://thegulacorp.com/marketplace.html" class="gula-btn-alt">VER LA CARTA</a>
    </div>
    <div class="center" style="margin-top:20px;">
      <a href="https://www.google.com/maps/search/?api=1&query=GULA+restaurant" class="gula-btn-maps">VALORAR EN GOOGLE MAPS</a>
    </div>
    <p style="color:#666;font-size:11px;text-align:center;margin-top:40px;letter-spacing:1px;">${new Date().toISOString().slice(0,10)}</p>
  `, { title: 'GULA - Factura de Pedido' })
}
