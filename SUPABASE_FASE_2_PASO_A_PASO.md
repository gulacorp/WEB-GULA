# Supabase Fase 2 — Paso a paso GULA

Esta guía activa la Fase 2: admin marketing, consentimiento legal, emails transaccionales, CMS básico, productos, auditoría y métricas.

## 0. Proyecto correcto

Proyecto Supabase actual:

- Project ref: `gblmjealpcyswcgjrhzk`
- URL: `https://gblmjealpcyswcgjrhzk.supabase.co`

## 1. Ejecutar SQL base

En Supabase Dashboard:

1. Ve a `SQL Editor`.
2. Crea una query nueva.
3. Copia el contenido completo de:
   - `supabase_005_admin_consent_email.sql`
4. Ejecuta la query.

Esto crea o actualiza:

- `admin_users`
- `consents`
- `site_content`
- `products`
- `email_log`
- `admin_audit_logs`
- `profitability_snapshots`
- vistas admin `v_admin_daily_metrics`, `v_admin_consent_summary`, `v_admin_revenue_summary`
- triggers de email para contactos, Club GULA y pedidos
- políticas RLS para admin marketing

## 2. Crear el usuario real en Supabase Auth

La tabla `admin_users` no crea contraseñas. Solo autoriza emails ya autenticados.

En Supabase Dashboard:

1. Ve a `Authentication` → `Users`.
2. Busca `marketing@thegulacorp.com`.
3. Si no existe, pulsa `Add user`.
4. Usa:
   - Email: `marketing@thegulacorp.com`
   - Password: `XR=9=n4GV9qH2rE=`
5. Confirma el email si Supabase lo permite desde el dashboard.

Si ya existe:

1. Abre el usuario.
2. Actualiza su password o envía reset.
3. Asegúrate de que el email está confirmado.

## 3. Permitir reset password del admin

En Supabase Dashboard:

1. Ve a `Authentication` → `URL Configuration`.
2. Añade en Redirect URLs la URL real de admin.

Ejemplos:

```text
https://thegulacorp.com/admin.html
https://TU_USUARIO.github.io/TU_REPO/admin.html
```

Si el admin está dentro de `/crew/`:

```text
https://thegulacorp.com/crew/admin.html
```

## 4. Configurar secrets de Edge Function

En Supabase Dashboard:

1. Ve a `Project Settings` → `Edge Functions` → `Secrets`.
2. Añade:

```text
RESEND_API_KEY=PEGA_AQUI_TU_KEY_REAL_DE_RESEND
FROM_EMAIL=Gula <onboarding@resend.dev>
ADMIN_EMAIL=marketing@thegulacorp.com
EMAIL_WEBHOOK_SECRET=gula_phase2_email_webhook_2026_change_me
```

Recomendación:

- No guardes `RESEND_API_KEY` en el repositorio. Debe ir solo en Supabase Secrets.
- Mientras el DNS no esté listo, usa `Gula <onboarding@resend.dev>` o el remitente verificado que Resend te permita.
- Cuando `thegulacorp.com` esté verificado en Resend, cambia `FROM_EMAIL` a `Gula <noreply@thegulacorp.com>`.

## 5. Configurar settings SQL opcionales

Si defines `EMAIL_WEBHOOK_SECRET`, ejecuta en SQL Editor:

```sql
alter database postgres set app.settings.email_webhook_secret = 'gula_phase2_email_webhook_2026_change_me';
```

Opcionalmente, para evitar fallback hardcodeado:

```sql
alter database postgres set app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA';
```

Después de ejecutar estos `alter database`, abre una nueva sesión SQL o espera a que Supabase use la nueva configuración.

## 6. Desplegar Edge Function send-email

Desde Supabase CLI, si está configurado:

```bash
supabase functions deploy send-email --project-ref gblmjealpcyswcgjrhzk
```

Luego verifica que la función tiene los secrets cargados.

## 7. Probar emails

Pruebas recomendadas:

1. Enviar formulario `contacto.html`.
2. Enviar formulario `franquiciado.html`.
3. Crear registro en `CLUBGULA.html`.
4. Crear pedido en marketplace.
5. Revisar:
   - bandeja del usuario
   - bandeja de `marketing@thegulacorp.com`
   - tabla `email_log`

## 8. Probar cookie consent

1. Abre una página pública en incógnito.
2. Rechaza cookies.
3. Verifica que no se carga PostHog.
4. Borra localStorage o abre otra sesión.
5. Acepta analítica.
6. Revisa que se inserta fila en `consents`.

## 9. Probar admin

1. Abre `admin.html` en la URL final.
2. Login con:
   - `marketing@thegulacorp.com`
   - password configurado en Supabase Auth
3. Verifica pestañas:
   - Métricas
   - Leads
   - CREW
   - Pedidos
   - Promos
   - Contenido
   - Productos
   - Consentimientos
   - Emails
   - Auditoría
   - Rentabilidad

## 10. Advisors de seguridad/performance

En Supabase Dashboard:

1. Ve a `Database` → `Advisors`.
2. Revisa `Security`.
3. Revisa `Performance`.
4. Corrige cualquier warning crítico.

El MCP de Supabase no pudo hacerlo desde el IDE porque falta `SUPABASE_ACCESS_TOKEN`.

## 11. Pendientes recomendados para Fase 3

- Mover compras y promos críticas a Edge Functions para cerrar RLS pública.
- Hacer que marketplace cargue productos desde `products`.
- Actualizar `email_log` a `sent` o `failed` desde la Edge Function.
- Añadir export CSV en admin.
- Añadir roles granulares: marketing, ops, finance, superadmin.
- Añadir backups y política de retención de datos.
