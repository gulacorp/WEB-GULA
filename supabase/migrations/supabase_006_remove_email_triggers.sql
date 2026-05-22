-- ============================================================
-- GULA — Eliminar Triggers de Email (evitar duplicación)
-- Ejecutar en: supabase.com → SQL Editor → New query
-- ============================================================

-- Eliminar triggers que causan duplicación de emails
-- El frontend ya envía emails directamente a la Edge Function

-- 1. Eliminar trigger de contactos
drop trigger if exists email_on_contacto_insert on public.contactos;
drop function if exists public.trigger_email_contacto();

-- 2. Eliminar trigger de franquicias
drop trigger if exists email_on_franquicia_insert on public.franquicias;
drop function if exists public.trigger_email_franquicia();

-- 3. Eliminar trigger de crew_members (Club GULA)
drop trigger if exists email_on_crew_member_insert on public.crew_members;
drop function if exists public.trigger_email_club_gula();

-- 4. Eliminar función de envío de email
drop function if exists public.send_email_via_edge();

-- ============================================================
-- Nota: Los emails ahora se envían únicamente desde el frontend
-- (contacto.html, franquiciado.html, club.html) para evitar duplicación
-- ============================================================
