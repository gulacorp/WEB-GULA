-- Tabla events para tracking de comportamiento de usuarios (PostHog + Supabase mirror)
-- Esta tabla recibe eventos desde analytics.js

create table if not exists public.events (
  id bigserial primary key,
  member_id uuid references public.crew_members(id) on delete set null,
  anon_id text not null,
  event_name text not null,
  store text,
  properties jsonb default '{}'::jsonb,
  utm jsonb default '{}'::jsonb,
  page_path text,
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

-- Índices para consultas rápidas
create index if not exists events_created_at_idx on public.events(created_at desc);
create index if not exists events_event_name_idx on public.events(event_name);
create index if not exists events_member_id_idx on public.events(member_id);
create index if not exists events_anon_id_idx on public.events(anon_id);
create index if not exists events_page_path_idx on public.events(page_path);

-- Vista para analytics del admin
create or replace view public.v_admin_analytics_events
with (security_invoker = true) as
select
  id,
  member_id,
  anon_id,
  event_name,
  store,
  properties,
  utm,
  page_path,
  referrer,
  user_agent,
  created_at
from public.events
order by created_at desc
limit 500;

-- Vista agregada por evento
create or replace view public.v_admin_analytics_summary
with (security_invoker = true) as
select
  event_name,
  count(*) as total_events,
  count(*) filter (where member_id is not null) as authenticated_events,
  count(*) filter (where member_id is null) as anonymous_events,
  count(distinct anon_id) as unique_users,
  count(distinct member_id) as unique_members,
  min(created_at) as first_event,
  max(created_at) as last_event
from public.events
group by event_name
order by total_events desc;

-- Vista de page views por ruta
create or replace view public.v_admin_page_views
with (security_invoker = true) as
select
  page_path,
  count(*) filter (where event_name = 'page_view') as page_views,
  count(*) filter (where event_name = 'page_view' and member_id is not null) as authenticated_views,
  count(distinct anon_id) filter (where event_name = 'page_view') as unique_visitors,
  count(distinct member_id) filter (where event_name = 'page_view' and member_id is not null) as unique_members
from public.events
where page_path is not null
group by page_path
order by page_views desc;

-- RLS policies
alter table public.events enable row level security;

-- Política para insertar eventos desde el frontend (anon/authenticated)
drop policy if exists "Insertar events" on public.events;
create policy "Insertar events" on public.events for insert to anon, authenticated with check (true);

-- Política para leer eventos solo admin
drop policy if exists "Leer events admin" on public.events;
create policy "Leer events admin" on public.events for select to authenticated using (public.is_gula_admin());

-- Grant para vistas
grant select on public.v_admin_analytics_events to authenticated;
grant select on public.v_admin_analytics_summary to authenticated;
grant select on public.v_admin_page_views to authenticated;
