-- ============================================================
-- GULA — Migración 002 · Customer Journey Extension
-- Aplicar después de supabase_setup.sql
-- Ejecutar en: supabase.com → SQL Editor → New query
-- ============================================================

-- ─── 1. Extender crew_members con campos del Customer Journey ───
alter table public.crew_members
  add column if not exists home_store          text,                  -- mostoles | valencia | cartagena | sevilla
  add column if not exists acquisition_source  text,                  -- qr_packaging | web_organic | instagram | referral | uber | other
  add column if not exists acquisition_utm     jsonb,                 -- {utm_source, utm_medium, utm_campaign, utm_content, utm_term}
  add column if not exists referral_code       text unique,           -- GULA-AB12CD
  add column if not exists first_order_at      timestamptz,
  add column if not exists last_order_at       timestamptz,
  add column if not exists lifetime_orders     integer default 0,
  add column if not exists lifetime_value      numeric(10,2) default 0,
  add column if not exists last_reminder_at    timestamptz,           -- para no spamear con recordatorios
  add column if not exists nps_last_score      integer,
  add column if not exists nps_last_at         timestamptz;

create index if not exists idx_crew_phone           on public.crew_members(telefono);
create index if not exists idx_crew_home_store      on public.crew_members(home_store);
create index if not exists idx_crew_last_order      on public.crew_members(last_order_at);
create index if not exists idx_crew_referral_code   on public.crew_members(referral_code);

-- ─── 2. Eventos analítica (espejo SQL de PostHog para KPIs del dashboard) ───
create table if not exists public.events (
  id           bigserial primary key,
  member_id    uuid references public.crew_members(id) on delete set null,
  anon_id      text,                                  -- uuid del navegador antes de identificarse
  event_name   text not null,
  store        text,
  properties   jsonb,
  utm          jsonb,
  page_path    text,
  referrer     text,
  user_agent   text,
  created_at   timestamptz default now()
);

create index if not exists idx_events_member_id  on public.events(member_id);
create index if not exists idx_events_anon_id    on public.events(anon_id);
create index if not exists idx_events_name       on public.events(event_name);
create index if not exists idx_events_store      on public.events(store);
create index if not exists idx_events_created    on public.events(created_at desc);

-- ─── 3. Referidos ───
create table if not exists public.referrals (
  id              bigserial primary key,
  referrer_id     uuid references public.crew_members(id) on delete cascade,
  referred_id     uuid references public.crew_members(id) on delete cascade,
  reward_status   text default 'pending',              -- pending | granted | cancelled
  reward_points   integer default 50,
  granted_at      timestamptz,
  created_at      timestamptz default now(),
  unique (referrer_id, referred_id)
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_referrals_referred on public.referrals(referred_id);

-- ─── 4. Encuestas NPS ───
create table if not exists public.nps_responses (
  id          bigserial primary key,
  member_id   uuid references public.crew_members(id) on delete cascade,
  score       integer not null check (score between 0 and 10),
  comment     text,
  store       text,
  created_at  timestamptz default now()
);

create index if not exists idx_nps_member  on public.nps_responses(member_id);
create index if not exists idx_nps_created on public.nps_responses(created_at desc);

-- ─── 5. Reservas de mesa ───
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.crew_members(id) on delete set null,
  store       text not null,                           -- mostoles | valencia | cartagena | sevilla
  fecha       date not null,
  franja      text not null,                           -- '12-14' | '14-16' | '20-22' | '22-00'
  personas    integer not null check (personas between 1 and 12),
  nombre      text not null,
  telefono    text not null,
  notas       text,
  estado      text default 'pendiente',                -- pendiente | confirmada | rechazada | cancelada | completada
  created_at  timestamptz default now()
);

create index if not exists idx_reservas_store_fecha on public.reservations(store, fecha);
create index if not exists idx_reservas_member      on public.reservations(member_id);

-- ─── 6. Auto-generar referral_code para crew_members existentes y futuros ───
create or replace function public.gen_referral_code()
returns trigger language plpgsql as $$
declare
  code text;
  attempts int := 0;
begin
  if new.referral_code is null then
    loop
      code := 'GULA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      exit when not exists (select 1 from public.crew_members where referral_code = code);
      attempts := attempts + 1;
      if attempts > 5 then exit; end if;
    end loop;
    new.referral_code := code;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gen_referral_code on public.crew_members;
create trigger trg_gen_referral_code
  before insert on public.crew_members
  for each row execute function public.gen_referral_code();

-- Backfill para miembros ya existentes
update public.crew_members
   set referral_code = 'GULA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
 where referral_code is null;

-- ─── 7. Trigger: cuando un pedido pasa a 'paid', actualiza stats del miembro ───
create or replace function public.update_member_lifetime_stats()
returns trigger language plpgsql as $$
begin
  if new.estado = 'paid' and (old.estado is distinct from 'paid') and new.member_id is not null then
    update public.crew_members
       set lifetime_orders = coalesce(lifetime_orders, 0) + 1,
           lifetime_value  = coalesce(lifetime_value, 0) + (new.monto::numeric / 100),
           last_order_at   = now(),
           first_order_at  = coalesce(first_order_at, now())
     where id = new.member_id;

    -- Si el miembro fue referido, dispara/actualiza la fila de referidos
    insert into public.referrals (referrer_id, referred_id, reward_status, granted_at)
    select rb.id, new.member_id, 'granted', now()
      from public.crew_members me
      join public.crew_members rb on rb.member_code = me.referido_por
     where me.id = new.member_id
       and me.referido_por is not null
    on conflict (referrer_id, referred_id) do update
      set reward_status = case when public.referrals.reward_status = 'pending' then 'granted' else public.referrals.reward_status end,
          granted_at   = case when public.referrals.granted_at is null then now() else public.referrals.granted_at end;

    -- Suma puntos al referrer si pasó a granted ahora mismo
    insert into public.puntos_historial (member_id, puntos, motivo, metadata)
    select r.referrer_id, r.reward_points, 'referido', jsonb_build_object('referred_id', r.referred_id, 'order_id', new.id)
      from public.referrals r
     where r.referred_id = new.member_id
       and r.reward_status = 'granted'
       and r.granted_at >= now() - interval '1 minute';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_lifetime_stats on public.pedidos;
create trigger trg_update_lifetime_stats
  after update on public.pedidos
  for each row execute function public.update_member_lifetime_stats();

-- ─── 8. RLS para las nuevas tablas ───
alter table public.events       enable row level security;
alter table public.referrals    enable row level security;
alter table public.nps_responses enable row level security;
alter table public.reservations enable row level security;

-- Lectura pública (de momento) — el service_role siempre bypasea
drop policy if exists "Leer events"       on public.events;
drop policy if exists "Leer referrals"    on public.referrals;
drop policy if exists "Leer nps"          on public.nps_responses;
drop policy if exists "Leer reservations" on public.reservations;
create policy "Leer events"       on public.events       for select using (true);
create policy "Leer referrals"    on public.referrals    for select using (true);
create policy "Leer nps"          on public.nps_responses for select using (true);
create policy "Leer reservations" on public.reservations for select using (true);

-- Insertar permitido (anon key se usa desde el frontend para tracking)
drop policy if exists "Insertar events"       on public.events;
drop policy if exists "Insertar referrals"    on public.referrals;
drop policy if exists "Insertar nps"          on public.nps_responses;
drop policy if exists "Insertar reservations" on public.reservations;
create policy "Insertar events"       on public.events       for insert with check (true);
create policy "Insertar referrals"    on public.referrals    for insert with check (true);
create policy "Insertar nps"          on public.nps_responses for insert with check (true);
create policy "Insertar reservations" on public.reservations for insert with check (true);

-- ─── 9. Vistas útiles para el dashboard CEO ───
create or replace view public.v_journey_funnel as
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

create or replace view public.v_members_by_store as
select
  coalesce(home_store, 'sin_tienda') as store,
  count(*) as miembros,
  count(*) filter (where lifetime_orders > 0) as miembros_activos,
  avg(lifetime_orders)::numeric(10,2) as pedidos_promedio,
  avg(lifetime_value)::numeric(10,2)  as valor_promedio,
  count(*) filter (where last_order_at > now() - interval '30 days') as activos_30d
from public.crew_members
group by 1;
