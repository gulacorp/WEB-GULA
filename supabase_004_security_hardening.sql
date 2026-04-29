-- ============================================================
-- GULA — Migración 004 · Hardening de seguridad
-- Aplicar después de 001, 002 y 003
-- Resuelve los warnings del Database Linter de Supabase:
--   - security_definer_view (ERROR)
--   - function_search_path_mutable (WARN)
--   - anon_security_definer_function_executable (WARN)
-- ============================================================

-- ─── 1. Vistas con SECURITY INVOKER (Postgres 15+) ─────────
-- Las vistas heredarán los permisos del usuario que las consulta,
-- no del que las creó. Esto respeta el RLS correctamente.

drop view if exists public.v_journey_funnel;
create view public.v_journey_funnel
with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  store,
  count(*) filter (where event_name = 'page_view')                as page_views,
  count(*) filter (where event_name = 'club_signup_started')      as signup_started,
  count(*) filter (where event_name = 'club_signup_completed')    as signup_completed,
  count(*) filter (where event_name = 'order_started')            as orders_started,
  count(*) filter (where event_name = 'order_paid')               as orders_paid,
  count(*) filter (where event_name = 'uber_redirect')            as uber_redirects,
  count(*) filter (where event_name = 'whatsapp_click')           as whatsapp_clicks
from public.events
group by 1, 2
order by 1 desc;

drop view if exists public.v_members_by_store;
create view public.v_members_by_store
with (security_invoker = true) as
select
  coalesce(home_store, 'sin_tienda') as store,
  count(*) as miembros,
  count(*) filter (where lifetime_orders > 0) as miembros_activos,
  avg(lifetime_orders)::numeric(10,2) as pedidos_promedio,
  avg(lifetime_value)::numeric(10,2)  as valor_promedio,
  count(*) filter (where last_order_at > now() - interval '30 days') as activos_30d
from public.crew_members
group by 1;

drop view if exists public.v_submissions_summary;
create view public.v_submissions_summary
with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  type,
  count(*) as total
from public.submissions
group by 1, 2
order by 1 desc, 2;

-- ─── 2. Fijar search_path en todas las funciones nuestras ──
-- Evita que un usuario con permisos pueda inyectar funciones
-- maliciosas en otros schemas que reemplacen las del sistema.

alter function public.actualizar_nivel()                  set search_path = public, pg_temp;
alter function public.gen_referral_code()                 set search_path = public, pg_temp;
alter function public.update_member_lifetime_stats()      set search_path = public, pg_temp;
alter function public.mirror_crew_to_submissions()        set search_path = public, pg_temp;
alter function public.mirror_contactos_to_submissions()   set search_path = public, pg_temp;
alter function public.mirror_reservations_to_submissions() set search_path = public, pg_temp;
alter function public.mirror_nps_to_submissions()         set search_path = public, pg_temp;
alter function public.mirror_pedidos_to_submissions()     set search_path = public, pg_temp;

-- ─── 3. Revocar acceso público a rls_auto_enable ───────────
-- Esta función la crea Supabase automáticamente al activar RLS
-- desde el dashboard. No debería ser ejecutable por el cliente.
do $$
begin
  if exists (select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end$$;

-- ─── 4. Restringir las políticas INSERT a roles específicos ─
-- Las políticas con WITH CHECK (true) que aplican a cualquier rol
-- generan warning. Las restringimos explícitamente a anon + authenticated
-- (el frontend usa la anon key; usuarios logueados usan authenticated).
-- El service_role del backend bypasea RLS automáticamente.

-- crew_members
drop policy if exists "Insertar miembros" on public.crew_members;
create policy "Insertar miembros" on public.crew_members
  for insert to anon, authenticated with check (true);

-- puntos_historial
drop policy if exists "Insertar historial" on public.puntos_historial;
create policy "Insertar historial" on public.puntos_historial
  for insert to anon, authenticated with check (true);

-- pedidos
drop policy if exists "Insertar pedidos" on public.pedidos;
create policy "Insertar pedidos" on public.pedidos
  for insert to anon, authenticated with check (true);

-- promos
drop policy if exists "Insertar promos" on public.promos;
create policy "Insertar promos" on public.promos
  for insert to anon, authenticated with check (true);

-- contactos
drop policy if exists "Insertar contactos" on public.contactos;
create policy "Insertar contactos" on public.contactos
  for insert to anon, authenticated with check (true);

-- events
drop policy if exists "Insertar events" on public.events;
create policy "Insertar events" on public.events
  for insert to anon, authenticated with check (true);

-- referrals
drop policy if exists "Insertar referrals" on public.referrals;
create policy "Insertar referrals" on public.referrals
  for insert to anon, authenticated with check (true);

-- nps_responses
drop policy if exists "Insertar nps" on public.nps_responses;
create policy "Insertar nps" on public.nps_responses
  for insert to anon, authenticated with check (true);

-- reservations
drop policy if exists "Insertar reservations" on public.reservations;
create policy "Insertar reservations" on public.reservations
  for insert to anon, authenticated with check (true);

-- submissions
drop policy if exists "Insertar submissions" on public.submissions;
create policy "Insertar submissions" on public.submissions
  for insert to anon, authenticated with check (true);
