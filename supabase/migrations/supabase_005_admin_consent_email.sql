alter table public.crew_members
  add column if not exists marketing_consent boolean default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists privacy_accepted boolean default false,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_accepted boolean default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists consent_source text,
  add column if not exists consent_version text default '2026-04';

alter table public.contactos
  add column if not exists marketing_consent boolean default false,
  add column if not exists privacy_accepted boolean default false,
  add column if not exists consent_source text,
  add column if not exists consent_version text default '2026-04';

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  email text,
  member_id uuid references public.crew_members(id) on delete set null,
  anon_id text,
  source text not null,
  necessary boolean default true,
  analytics boolean default false,
  marketing boolean default false,
  privacy_accepted boolean default false,
  terms_accepted boolean default false,
  consent_version text default '2026-04',
  user_agent text,
  page_path text,
  created_at timestamptz default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'marketing',
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  key text not null,
  value text,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  unique(section, key)
);

create table if not exists public.products (
  id bigserial primary key,
  title text not null,
  category text not null,
  price numeric(10,2) not null,
  image text,
  description text,
  rating numeric(3,2) default 4.8,
  active boolean default true,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.email_log (
  id bigserial primary key,
  email_to text not null,
  email_type text not null,
  status text not null default 'queued',
  provider_id text,
  error text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  admin_email text,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.profitability_snapshots (
  id bigserial primary key,
  label text default 'admin_snapshot',
  sales numeric(12,2) not null,
  cogs_percent numeric(5,2) not null,
  labor_percent numeric(5,2) not null,
  other_percent numeric(5,2) not null,
  profit numeric(12,2) not null,
  margin_percent numeric(5,2) not null,
  created_by text,
  created_at timestamptz default now()
);

create or replace view public.v_admin_daily_metrics
with (security_invoker = true) as
with days as (
  select generate_series(
    date_trunc('day', now()) - interval '29 days',
    date_trunc('day', now()),
    interval '1 day'
  )::date as day
),
members as (
  select created_at::date as day, count(*) as members
  from public.crew_members
  group by 1
),
leads as (
  select created_at::date as day, count(*) as leads
  from public.contactos
  group by 1
),
orders as (
  select created_at::date as day, count(*) as orders, coalesce(sum(monto), 0)::numeric / 100 as revenue
  from public.pedidos
  group by 1
),
optins as (
  select created_at::date as day, count(*) filter (where marketing = true) as marketing_optins
  from public.consents
  group by 1
)
select
  days.day,
  coalesce(members.members, 0) as members,
  coalesce(leads.leads, 0) as leads,
  coalesce(orders.orders, 0) as orders,
  coalesce(orders.revenue, 0) as revenue,
  coalesce(optins.marketing_optins, 0) as marketing_optins
from days
left join members using (day)
left join leads using (day)
left join orders using (day)
left join optins using (day)
order by days.day desc;

create or replace view public.v_admin_consent_summary
with (security_invoker = true) as
select
  consent_version,
  count(*) as total,
  count(*) filter (where analytics = true) as analytics_yes,
  count(*) filter (where marketing = true) as marketing_yes,
  count(*) filter (where privacy_accepted = true) as privacy_yes
from public.consents
group by consent_version
order by consent_version desc;

create or replace view public.v_admin_revenue_summary
with (security_invoker = true) as
select
  date_trunc('month', created_at)::date as month,
  count(*) as orders,
  coalesce(sum(monto), 0)::numeric / 100 as revenue
from public.pedidos
group by 1
order by 1 desc;

create extension if not exists pg_net;

create or replace function public.send_email_via_edge(
  email_to text,
  email_type text,
  payload jsonb
) returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.email_log (email_to, email_type, status, payload)
  values (email_to, email_type, 'queued', payload);

  perform
    net.http_post(
      url := 'https://gblmjealpcyswcgjrhzk.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-gula-email-secret', coalesce(current_setting('app.settings.email_webhook_secret', true), ''),
        'Authorization', 'Bearer ' || coalesce(
          nullif(current_setting('app.settings.supabase_anon_key', true), ''),
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA'
        )
      ),
      body := jsonb_build_object(
        'to', email_to,
        'type', email_type,
        'data', payload
      )
    );
end;
$$;

insert into public.admin_users (email, role, active)
values ('marketing@thegulacorp.com', 'marketing', true)
on conflict (email) do update set role = excluded.role, active = true;

create or replace function public.is_gula_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.email = auth.jwt() ->> 'email'
      and au.active = true
  );
$$;

alter table public.consents enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.products enable row level security;
alter table public.email_log enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.profitability_snapshots enable row level security;

grant select on public.v_admin_daily_metrics to authenticated;
grant select on public.v_admin_consent_summary to authenticated;
grant select on public.v_admin_revenue_summary to authenticated;

drop policy if exists "Insertar consents" on public.consents;
create policy "Insertar consents" on public.consents for insert to anon, authenticated with check (true);

drop policy if exists "Leer consents admin" on public.consents;
create policy "Leer consents admin" on public.consents for select to authenticated using (public.is_gula_admin());

drop policy if exists "Leer admin_users autenticado" on public.admin_users;
create policy "Leer admin_users autenticado" on public.admin_users for select to authenticated using (
  email = auth.jwt() ->> 'email' and active = true
);

drop policy if exists "Leer site_content" on public.site_content;
create policy "Leer site_content" on public.site_content for select to anon, authenticated using (true);

drop policy if exists "Editar site_content admin" on public.site_content;
create policy "Editar site_content admin" on public.site_content for all to authenticated using (
  public.is_gula_admin()
) with check (
  public.is_gula_admin()
);

drop policy if exists "Leer products" on public.products;
create policy "Leer products" on public.products for select to anon, authenticated using (active = true or exists (
  select 1 from public.admin_users au where au.email = auth.jwt() ->> 'email' and au.active = true
));

drop policy if exists "Editar products admin" on public.products;
create policy "Editar products admin" on public.products for all to authenticated using (
  public.is_gula_admin()
) with check (
  public.is_gula_admin()
);

drop policy if exists "Leer email_log admin" on public.email_log;
create policy "Leer email_log admin" on public.email_log for select to authenticated using (public.is_gula_admin());

drop policy if exists "Leer admin_audit_logs admin" on public.admin_audit_logs;
create policy "Leer admin_audit_logs admin" on public.admin_audit_logs for select to authenticated using (public.is_gula_admin());

drop policy if exists "Insertar admin_audit_logs admin" on public.admin_audit_logs;
create policy "Insertar admin_audit_logs admin" on public.admin_audit_logs for insert to authenticated with check (public.is_gula_admin());

drop policy if exists "Leer profitability_snapshots admin" on public.profitability_snapshots;
create policy "Leer profitability_snapshots admin" on public.profitability_snapshots for select to authenticated using (public.is_gula_admin());

drop policy if exists "Insertar profitability_snapshots admin" on public.profitability_snapshots;
create policy "Insertar profitability_snapshots admin" on public.profitability_snapshots for insert to authenticated with check (public.is_gula_admin());

do $$
begin
  if to_regclass('public.submissions') is not null then
    drop policy if exists "Leer submissions admin" on public.submissions;
    create policy "Leer submissions admin" on public.submissions for select to authenticated using (
      public.is_gula_admin()
    );
  end if;
end;
$$;

drop policy if exists "Leer contactos admin" on public.contactos;
create policy "Leer contactos admin" on public.contactos for select to authenticated using (public.is_gula_admin());

drop policy if exists "Leer crew admin" on public.crew_members;
create policy "Leer crew admin" on public.crew_members for select to authenticated using (public.is_gula_admin());

drop policy if exists "Leer pedidos admin" on public.pedidos;
create policy "Leer pedidos admin" on public.pedidos for select to authenticated using (public.is_gula_admin());

drop policy if exists "Editar promos admin" on public.promos;
create policy "Editar promos admin" on public.promos for all to authenticated using (
  public.is_gula_admin()
) with check (
  public.is_gula_admin()
);

create or replace function public.trigger_email_contacto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.send_email_via_edge(
    new.email,
    case when new.tipo = 'franquiciado' then 'franquicia' else 'contacto' end,
    jsonb_build_object(
      'nombre', new.nombre,
      'email', new.email,
      'telefono', new.telefono,
      'ciudad', new.ciudad,
      'tipo', new.tipo,
      'mensaje', new.mensaje
    )
  );
  return new;
end;
$$;

drop trigger if exists email_on_contacto_insert on public.contactos;
create trigger email_on_contacto_insert
  after insert on public.contactos
  for each row execute function public.trigger_email_contacto();

create or replace function public.trigger_email_club_gula()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.send_email_via_edge(
    new.email,
    'club_gula',
    jsonb_build_object(
      'nombre', new.nombre,
      'memberCode', new.member_code,
      'puntos', new.puntos,
      'nivel', new.nivel,
      'marketingConsent', new.marketing_consent
    )
  );
  return new;
end;
$$;

drop trigger if exists email_on_crew_member_insert on public.crew_members;
create trigger email_on_crew_member_insert
  after insert on public.crew_members
  for each row execute function public.trigger_email_club_gula();

create or replace function public.trigger_email_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_email text;
  member_name text;
  member_code text;
begin
  select email, nombre, member_code
    into member_email, member_name, member_code
  from public.crew_members
  where id = new.member_id;

  if member_email is null then
    return new;
  end if;

  perform public.send_email_via_edge(
    member_email,
    'pedido',
    jsonb_build_object(
      'nombre', member_name,
      'email', member_email,
      'memberCode', member_code,
      'total', coalesce(new.monto, 0)::numeric / 100,
      'puntos', floor(coalesce(new.monto, 0)::numeric / 100),
      'items', coalesce(new.items, '[]'::jsonb)
    )
  );
  return new;
end;
$$;

drop trigger if exists email_on_pedido_insert on public.pedidos;
create trigger email_on_pedido_insert
  after insert on public.pedidos
  for each row execute function public.trigger_email_pedido();
