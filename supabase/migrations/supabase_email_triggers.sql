-- ============================================================
-- GULA — Email Triggers Setup (Resend Integration)
-- Ejecutar en: supabase.com → SQL Editor → New query
-- ============================================================

-- 1. Función para llamar a la Edge Function desde trigger
-- Esta función se ejecuta después de insertar un registro

create or replace function public.send_email_via_edge(
  email_to text,
  email_type text,
  payload jsonb
) returns void
language plpgsql
security definer
as $$
declare
  edge_function_url text;
begin
  -- URL de la Edge Function (se actualizará después del deploy)
  edge_function_url := 'https://gblmjealpcyswcgjrhzk.supabase.co/functions/v1/send-email';
  
  -- Llamar a la Edge Function usando pg_net (requiere extensión pg_net)
  perform
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA'
      ),
      body := jsonb_build_object(
        'to', email_to,
        'type', email_type,
        'data', payload
      )
    );
end;
$$;

-- 2. Trigger para enviar email al nuevo contacto
-- Se ejecuta después de insertar en la tabla contactos

create or replace function public.trigger_email_contacto()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Enviar email de confirmación al contacto
  perform public.send_email_via_edge(
    new.email,
    'contacto',
    jsonb_build_object(
      'nombre', new.nombre,
      'email', new.email
    )
  );
  return new;
end;
$$;

-- Crear el trigger si no existe
drop trigger if exists email_on_contacto_insert on public.contactos;
create trigger email_on_contacto_insert
  after insert on public.contactos
  for each row
  execute function public.trigger_email_contacto();

-- 3. Trigger para enviar email al nuevo franquiciado

create or replace function public.trigger_email_franquicia()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.send_email_via_edge(
    new.email,
    'franquicia',
    jsonb_build_object(
      'nombre', new.nombre,
      'ciudad', new.ciudad
    )
  );
  return new;
end;
$$;

drop trigger if exists email_on_franquicia_insert on public.franquicias;
create trigger email_on_franquicia_insert
  after insert on public.franquicias
  for each row
  execute function public.trigger_email_franquicia();

-- 4. Trigger para enviar email al nuevo miembro del Club GULA
-- Incluye el código de miembro generado

create or replace function public.trigger_email_club_gula()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.send_email_via_edge(
    new.email,
    'club_gula',
    jsonb_build_object(
      'nombre', new.nombre,
      'memberCode', new.member_code
    )
  );
  return new;
end;
$$;

drop trigger if exists email_on_crew_member_insert on public.crew_members;
create trigger email_on_crew_member_insert
  after insert on public.crew_members
  for each row
  execute function public.trigger_email_club_gula();

-- 5. Asegurar que pg_net esté habilitado (para hacer HTTP desde PostgreSQL)
create extension if not exists pg_net;

-- ============================================================
-- Instrucciones de despliegue:
-- 1. Ejecutar este SQL en el editor de Supabase
-- 2. Deployar la Edge Function con:
--    supabase functions deploy send-email --project-ref gblmjealpcyswcgjrhzk
-- 3. Configurar la variable de entorno RESEND_API_KEY en Supabase Dashboard:
--    Settings → API → Edge Function Secrets → Add secret:
--    Name: RESEND_API_KEY
--    Value: re_U8Uiosin_KhPtrEcX7KxTRTrUP8SJHKwM
-- ============================================================
