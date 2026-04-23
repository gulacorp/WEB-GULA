const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config();

function getEnv(name, { defaultValue } = {}) {
    const value = process.env[name];
    if (value === undefined || value === null || value === '') return defaultValue;
    return value;
}

// ======================= INTEGRATIONS / CREDENTIALS =======================

// Stripe
const STRIPE_SECRET_KEY = getEnv('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = getEnv('STRIPE_WEBHOOK_SECRET');

// Supabase
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Resend (email transaccional)
const RESEND_API_KEY = getEnv('RESEND_API_KEY');
const FROM_EMAIL = getEnv('FROM_EMAIL', { defaultValue: 'marketing@thegulacorp.com' });

// Google Apps Script (sheets + emails gratuitos, sin dependencias externas)
const APPS_SCRIPT_WEBHOOK_URL = getEnv('APPS_SCRIPT_WEBHOOK_URL');

// Google Maps
const GOOGLE_MAPS_API_KEY = getEnv('GOOGLE_MAPS_API_KEY');

// Crisp (chat widget — solo se usa en el frontend, se expone como endpoint público)
const CRISP_WEBSITE_ID = getEnv('CRISP_WEBSITE_ID');

// PassKit & Google Wallet
const PASSKIT_TOKEN = getEnv('PASSKIT_TOKEN');
const GOOGLE_WALLET_ISSUER_ID = getEnv('GOOGLE_WALLET_ISSUER_ID');
const GOOGLE_WALLET_CLASS_ID = getEnv('GOOGLE_WALLET_CLASS_ID', { defaultValue: 'gula_loyalty_class_001' });
const GOOGLE_WALLET_SIGNING_KEY = getEnv('GOOGLE_WALLET_SIGNING_KEY');
const GOOGLE_WALLET_SIGNING_ALG = getEnv('GOOGLE_WALLET_SIGNING_ALG', { defaultValue: 'HS256' });

// Clientes inicializados
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// /menu and /menu.html → marketplace (must be before static middleware)
app.get(['/menu', '/menu.html'], (req, res) => {
    res.redirect(301, '/crew/marketplace.html');
});

// Serve /public/crew assets (fonts, images) under /crew path
app.use('/crew', express.static(path.join(__dirname, 'public', 'crew')));
// Serve all /public pages at root level (contacto.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));
// Fallback: serve root directory (for any other static files)
app.use(express.static(path.join(__dirname)));

// Ruta para crear payment intent
app.post('/create-payment-intent', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe not configured',
                message: 'Missing STRIPE_SECRET_KEY in environment'
            });
        }

        const { amount, currency } = req.body;

        console.log(`[PAGO] Creating payment intent for ${amount} cents in ${currency}`);

        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'Invalid amount',
                message: 'Amount must be greater than 0' 
            });
        }

        if (amount > 999999) {
            return res.status(400).json({ 
                error: 'Amount too large',
                message: 'Amount cannot exceed 99.99€' 
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount),
            currency: currency || 'eur',
            metadata: {
                integration_check: 'accept_a_payment',
                source: 'gula_marketplace',
            },
            description: 'GULA Marketplace Order',
        });

        console.log(`[PAGO] Payment intent created: ${paymentIntent.id}`);

        res.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            status: paymentIntent.status,
        });
    } catch (error) {
        console.error('[PAGO ERROR]:', error);
        res.status(500).json({ 
            error: 'Error creating payment intent',
            message: error.message 
        });
    }
});

// Ruta para obtener el estado del payment intent
app.get('/payment-intent/:id', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe not configured',
                message: 'Missing STRIPE_SECRET_KEY in environment'
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
        res.json({
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        });
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        res.status(500).json({ error: 'Error retrieving payment intent' });
    }
});

// Ruta para webhook (para confirmar pagos)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    if (!stripe) {
        return res.status(503).json({
            error: 'Stripe not configured',
            message: 'Missing STRIPE_SECRET_KEY in environment'
        });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        // Verificar el webhook si tienes el secret configurado
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('[WEBHOOK ERROR]:', err.message);
        return res.sendStatus(400);
    }

    // Manejar eventos
    switch (event.type) {
        case 'payment_intent.succeeded':
            console.log(`[WEBHOOK] Payment succeeded:`, event.data.object.id, `- ${event.data.object.amount / 100}€`);
            // Aquí puedes guardar el pedido en tu base de datos
            break;
        case 'payment_intent.payment_failed':
            console.log(`[WEBHOOK] Payment failed:`, event.data.object.id);
            break;
        case 'payment_intent.canceled':
            console.log(`[WEBHOOK] Payment canceled:`, event.data.object.id);
            break;
        default:
            console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    res.sendStatus(200);
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'crew', 'gulatemplate.html'));
});

// Endpoint público — expone solo keys seguras para el frontend
app.get('/api/config', (req, res) => {
    res.json({
        posthog: {
            apiKey: getEnv('POSTHOG_API_KEY') || null,
            host: getEnv('POSTHOG_HOST') || 'https://us.posthog.com',
        },
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || null,
        crispWebsiteId: CRISP_WEBSITE_ID || null,
        supabaseUrl: SUPABASE_URL || null,
        supabaseAnonKey: getEnv('SUPABASE_ANON_KEY') || null,
    });
});

// ======================= CREW / CLUB GULA =======================

// Helpers
function generateMemberCode(nombre, apellido) {
    const initials = ((nombre || '')[0] || 'X') + ((apellido || '')[0] || 'X');
    const num = Math.floor(1000 + Math.random() * 9000);
    return `GULA-${initials.toUpperCase()}${num}`;
}

function calcularNivel(puntos) {
    if (puntos >= 500) return 'FOUNDERS';
    if (puntos >= 200) return 'HIGH CREW';
    if (puntos >= 50) return 'CREW';
    return 'NEOPHYTE';
}

async function enviarEmailBienvenida(member) {
    if (!resend) return;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: member.email,
            subject: '¡Bienvenido a la CREW de GULA! 🔥',
            html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{background:#0a0a0a;color:#ffffff;font-family:Inter,sans-serif;margin:0;padding:0}
  .container{max-width:600px;margin:0 auto;background:#111;border-left:4px solid #FF5800;border-right:4px solid #FF5800}
  .header{background:linear-gradient(135deg,#FF5800,#FF7A29);padding:40px;text-align:center}
  .header h1{margin:0;font-size:2.5rem;font-weight:900;color:#000;letter-spacing:3px}
  .body{padding:40px}
  .code-box{background:#000;border:2px dashed #FF5800;border-radius:15px;padding:30px;text-align:center;margin:30px 0}
  .code{font-size:2rem;font-weight:900;color:#FF5800;letter-spacing:4px}
  .points{display:inline-block;background:#FF5800;color:#000;padding:8px 20px;border-radius:20px;font-weight:900;margin-top:15px}
  .btn{display:inline-block;background:linear-gradient(135deg,#FF5800,#FF7A29);color:#000;padding:15px 40px;border-radius:50px;text-decoration:none;font-weight:900;font-size:1rem;margin-top:20px}
  .footer{background:#000;padding:20px;text-align:center;color:#666;font-size:0.8rem;border-top:1px solid #FF580022}
</style>
</head><body>
<div class="container">
  <div class="header"><h1>GULA CREW</h1></div>
  <div class="body">
    <p>Hola <strong>${member.nombre}</strong>, ¡ya eres parte de la familia más exclusiva!</p>
    <div class="code-box">
      <small style="text-transform:uppercase;font-weight:900;opacity:0.7">Tu código de miembro</small>
      <div class="code">${member.member_code}</div>
      <div class="points">+${member.puntos} PUNTOS ACUMULADOS</div>
    </div>
    <p style="color:#b0b0b0">Guarda este código para consultar tu estado, canjear puntos y acceder a ofertas exclusivas.</p>
    <p>Niveles disponibles:<br>
      <span style="color:#FF5800">NEOPHYTE (0pts) → CREW (50pts) → HIGH CREW (200pts) → FOUNDERS (500pts)</span>
    </p>
    <center><a href="https://thegulacorp.com/crew" class="btn">VER MI PERFIL</a></center>
  </div>
  <div class="footer">© 2026 GULA Corp · marketing@thegulacorp.com</div>
</div>
</body></html>`,
        });
    } catch (err) {
        console.error('[EMAIL] Error enviando bienvenida:', err.message);
    }
}

async function enviarEmailPromo(member, promo) {
    if (!resend) return;
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: member.email,
            subject: `🎁 ${promo.descuento}% OFF solo para ti, ${member.nombre}`,
            html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{background:#0a0a0a;color:#ffffff;font-family:Inter,sans-serif;margin:0}
  .container{max-width:600px;margin:0 auto;background:#111;border-left:4px solid #FF5800;border-right:4px solid #FF5800}
  .header{background:linear-gradient(135deg,#FF5800,#FF7A29);padding:40px;text-align:center}
  .header h1{margin:0;font-size:2rem;font-weight:900;color:#000}
  .body{padding:40px;text-align:center}
  .code-box{background:#000;border:2px dashed #FF5800;border-radius:15px;padding:30px;margin:30px 0}
  .code{font-size:2.5rem;font-weight:900;color:#FF5800;letter-spacing:4px}
  .btn{display:inline-block;background:linear-gradient(135deg,#FF5800,#FF7A29);color:#000;padding:15px 40px;border-radius:50px;text-decoration:none;font-weight:900;margin-top:20px}
  .footer{background:#000;padding:20px;text-align:center;color:#666;font-size:0.8rem}
</style>
</head><body>
<div class="container">
  <div class="header"><h1>¡PROMO EXCLUSIVA CREW!</h1></div>
  <div class="body">
    <p>Hola <strong>${member.nombre}</strong>, por ser parte de la CREW tienes:</p>
    <div class="code-box">
      <div style="font-size:3rem;font-weight:900;color:#FF5800">${promo.descuento}% OFF</div>
      <small style="opacity:0.7;text-transform:uppercase">Código de descuento</small>
      <div class="code">${promo.codigo}</div>
      <small style="color:#666">Válido hasta ${new Date(promo.expires_at).toLocaleDateString('es-ES')}</small>
    </div>
    <a href="https://thegulacorp.com" class="btn">USAR AHORA</a>
  </div>
  <div class="footer">© 2026 GULA Corp</div>
</div>
</body></html>`,
        });
    } catch (err) {
        console.error('[EMAIL] Error enviando promo:', err.message);
    }
}

// POST /api/crew/register — Registro nuevo miembro
app.post('/api/crew/register', async (req, res) => {
    try {
        const { nombre, apellido, email, zip, telefono, followed_ig, referido_por } = req.body;
        if (!nombre || !email) {
            return res.status(400).json({ error: 'nombre y email son requeridos' });
        }

        let puntos = 0;
        if (telefono) puntos += 22;
        if (followed_ig) puntos += 40;
        puntos += 10; // base por registro

        const member_code = generateMemberCode(nombre, apellido);
        const nivel = calcularNivel(puntos);

        if (supabase) {
            // Verificar duplicado
            const { data: existing } = await supabase
                .from('crew_members')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (existing) {
                return res.status(409).json({ error: 'Este email ya está registrado' });
            }

            const { data: member, error } = await supabase
                .from('crew_members')
                .insert({ nombre, apellido, email, zip, telefono, puntos, nivel, member_code, followed_ig: !!followed_ig, referido_por })
                .select()
                .single();

            if (error) throw error;

            // Historial inicial
            await supabase.from('puntos_historial').insert({
                member_id: member.id,
                puntos,
                motivo: 'registro',
                metadata: { followed_ig, tiene_telefono: !!telefono },
            });

            // Promo de bienvenida (15% OFF)
            const promoCode = `BIENVENIDA-${member_code}`;
            const expires = new Date(); expires.setDate(expires.getDate() + 30);
            await supabase.from('promos').insert({
                member_id: member.id,
                codigo: promoCode,
                descuento: 15,
                motivo: 'bienvenida',
                expires_at: expires.toISOString(),
            });

            // Apps Script webhook (Google Sheets backup)
            if (APPS_SCRIPT_WEBHOOK_URL) {
                fetch(APPS_SCRIPT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...member, followedInsta: followed_ig ? 'SI' : 'NO' }),
                }).catch(e => console.warn('[SHEETS]', e.message));
            }

            await enviarEmailBienvenida(member);
            return res.json({ success: true, member_code: member.member_code, puntos: member.puntos, nivel: member.nivel });
        }

        // Fallback sin Supabase (solo en desarrollo)
        return res.json({ success: true, member_code, puntos, nivel });
    } catch (err) {
        console.error('[CREW REGISTER]', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/crew/member/:code — Consultar miembro por código
app.get('/api/crew/member/:code', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase
            .from('crew_members')
            .select('member_code, nombre, apellido, puntos, nivel, followed_ig, created_at')
            .eq('member_code', req.params.code.toUpperCase())
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Miembro no encontrado' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/crew/points/add — Añadir puntos (uso interno / webhook)
app.post('/api/crew/points/add', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    try {
        const { member_code, puntos, motivo, metadata } = req.body;
        if (!member_code || !puntos || !motivo) {
            return res.status(400).json({ error: 'member_code, puntos y motivo son requeridos' });
        }
        const { data: member, error } = await supabase
            .from('crew_members')
            .select('id, puntos, nombre, email')
            .eq('member_code', member_code.toUpperCase())
            .maybeSingle();
        if (error) throw error;
        if (!member) return res.status(404).json({ error: 'Miembro no encontrado' });

        const newPuntos = member.puntos + puntos;
        const { error: updateError } = await supabase
            .from('crew_members')
            .update({ puntos: newPuntos })
            .eq('id', member.id);
        if (updateError) throw updateError;

        await supabase.from('puntos_historial').insert({
            member_id: member.id,
            puntos,
            motivo,
            metadata,
        });

        // Auto-promo al alcanzar 100 puntos
        if (member.puntos < 100 && newPuntos >= 100) {
            const promoCode = `CREW100-${member_code}`;
            const expires = new Date(); expires.setDate(expires.getDate() + 14);
            const { data: promo } = await supabase.from('promos').insert({
                member_id: member.id,
                codigo: promoCode,
                descuento: 20,
                motivo: 'puntos_100',
                expires_at: expires.toISOString(),
            }).select().single();
            if (promo) await enviarEmailPromo({ ...member, member_code }, promo);
        }

        res.json({ success: true, puntos_nuevos: newPuntos, nivel: calcularNivel(newPuntos) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/promos/check/:codigo — Verificar si un código promo es válido
app.get('/api/promos/check/:codigo', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase
            .from('promos')
            .select('codigo, descuento, usado, expires_at')
            .eq('codigo', req.params.codigo.toUpperCase())
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Código no encontrado' });
        if (data.usado) return res.status(410).json({ error: 'Código ya utilizado' });
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Código expirado' });
        }
        res.json({ valid: true, descuento: data.descuento });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/contact — Formulario de contacto + franquiciados
app.post('/api/contact', async (req, res) => {
    try {
        const { nombre, email, telefono, tipo, mensaje, ciudad } = req.body;
        if (!email || !nombre) return res.status(400).json({ error: 'nombre y email son requeridos' });

        if (supabase) {
            await supabase.from('contactos').insert({ nombre, email, telefono, tipo: tipo || 'contacto', mensaje, ciudad });
        }

        // Apps Script / Google Sheets
        if (APPS_SCRIPT_WEBHOOK_URL) {
            fetch(APPS_SCRIPT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: tipo || 'contacto', nombre, email, telefono, mensaje, ciudad, fecha: new Date().toISOString() }),
            }).catch(e => console.warn('[SHEETS contact]', e.message));
        }

        // Email de notificación al equipo GULA
        if (resend) {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: FROM_EMAIL,
                subject: `[GULA] Nuevo ${tipo || 'contacto'} de ${nombre}`,
                html: `<p><b>Nombre:</b> ${nombre}</p><p><b>Email:</b> ${email}</p><p><b>Teléfono:</b> ${telefono || '-'}</p><p><b>Ciudad:</b> ${ciudad || '-'}</p><p><b>Mensaje:</b><br>${mensaje || '-'}</p>`,
            }).catch(e => console.warn('[EMAIL contact]', e.message));
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ======================= APPLE WALLET (PassKit) =======================
// Generar Pass para Apple Wallet usando PassKit API
app.post('/api/wallet/apple-pass', async (req, res) => {
    try {
        if (!PASSKIT_TOKEN) {
            return res.status(503).json({
                error: 'PassKit not configured',
                message: 'Missing PASSKIT_TOKEN in environment'
            });
        }

        const { memberId, nombre, apellido, email, telefono, puntos } = req.body;

        if (!memberId || !nombre) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Crear request al API de PassKit
        const passData = {
            name: `${nombre} ${apellido}`,
            description: 'GULA Loyalty Card',
            membershipNumber: memberId,
            email: email,
            phone: telefono,
            externalId: memberId,
            points: puntos || 0,
            currency: 'EUR',
            tierLevel: 'bronze',
            groupIdentifier: 'com.gula.loyalty',
        };

        // Hacer request a PassKit API
        const response = await fetch('https://api.passkit.io/loyalty/members/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PASSKIT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(passData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PassKit Error:', data);
            return res.status(response.status).json({ error: data.message || 'Error creating pass' });
        }

        // Generar URL del pass descargable
        const passUrl = `https://api.passkit.io/loyalty/members/${data.id}/pass.pkpass`;

        res.json({
            success: true,
            passUrl: passUrl,
            memberId: data.id,
            message: 'Apple Wallet pass created successfully'
        });

    } catch (error) {
        console.error('Apple Pass Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ======================= GOOGLE WALLET =======================
// Generar credencial para Google Wallet
app.post('/api/wallet/google-pass', async (req, res) => {
    try {
        if (!GOOGLE_WALLET_ISSUER_ID || !GOOGLE_WALLET_SIGNING_KEY) {
            return res.status(503).json({
                error: 'Google Wallet not configured',
                message: 'Missing GOOGLE_WALLET_ISSUER_ID and/or GOOGLE_WALLET_SIGNING_KEY in environment'
            });
        }

        const { memberId, nombre, apellido, email, telefono, puntos } = req.body;

        if (!memberId || !nombre) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Crear JWT para Google Wallet
        const iat = Math.floor(Date.now() / 1000);
        const payload = {
            iss: 'wallet-integration@gula-intel.iam.gserviceaccount.com',
            aud: 'google',
            origins: ['localhost', 'https://gula.com'],
            typ: 'savetowallet',
            payload: {
                loyaltyObjects: [
                    {
                        id: `${GOOGLE_WALLET_ISSUER_ID}.${memberId}`,
                        classId: `${GOOGLE_WALLET_ISSUER_ID}.${GOOGLE_WALLET_CLASS_ID}`,
                        accountId: memberId,
                        accountName: `${nombre} ${apellido}`,
                        state: 'ACTIVE',
                        loyaltyPoints: {
                            balance: {
                                int: puntos || 0,
                            },
                            label: 'PUNTOS GULA',
                        },
                        userInfo: {
                            email: email,
                            phone: telefono,
                        },
                    }
                ]
            }
        };

        // Crear JWT (en producción, esto se debe firmar con la clave privada de Google)
        const token = jwt.sign(payload, GOOGLE_WALLET_SIGNING_KEY, { 
            expiresIn: '1h',
            algorithm: GOOGLE_WALLET_SIGNING_ALG
        });

        // URL para agregar a Google Wallet
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        res.json({
            success: true,
            saveUrl: saveUrl,
            memberId: `${GOOGLE_WALLET_ISSUER_ID}.${memberId}`,
            message: 'Google Wallet credential created successfully'
        });

    } catch (error) {
        console.error('Google Wallet Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generar datos del pass simple (JSON para mostrar en pantalla)
app.post('/api/wallet/pass-data', async (req, res) => {
    try {
        const { memberId, nombre, apellido, email, telefono, puntos } = req.body;

        if (!memberId || !nombre) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const passData = {
            memberId: memberId,
            nombre: nombre,
            apellido: apellido,
            email: email,
            telefono: telefono,
            puntos: puntos || 0,
            cardNumber: `GULA-${memberId.slice(-4).padStart(4, '0')}`,
            issueDate: new Date().toISOString().split('T')[0],
            cardColor: generateCardColor(memberId),
        };

        res.json({
            success: true,
            data: passData
        });

    } catch (error) {
        console.error('Pass Data Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function para generar color único
function generateCardColor(seed) {
    const colors = [
        '#FF5800', // Gula Orange
        '#FF7A2B',
        '#FF8C42',
        '#FFA64D',
        '#FFBE61',
        '#D94400',
        '#B83800',
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash;
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🍔 GULA Marketplace running on http://localhost:${PORT}`);
    if (stripe) {
        console.log('Stripe is configured and ready for payments');
    } else {
        console.log('Stripe is NOT configured (missing STRIPE_SECRET_KEY). Payment endpoints will return 503.');
    }
});
