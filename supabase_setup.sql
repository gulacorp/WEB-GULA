-- ============================================================
-- GULA — Supabase Database Setup
-- Ejecutar en: supabase.com → SQL Editor → New query
-- ============================================================

-- 1. Tabla principal de miembros del Club GULA
create table if not exists public.crew_members (
  id            uuid primary key default gen_random_uuid(),
  member_code   text unique not null,          -- GULA-XX1234
  nombre        text not null,
  apellido      text not null,
  email         text unique not null,
  telefono      text,
  zip           text,
  puntos        integer default 0,
  nivel         text default 'NEOPHYTE',       -- NEOPHYTE, CREW, HIGH CREW, FOUNDERS
  followed_ig   boolean default false,
  referido_por  text,                          -- member_code del que lo refirió
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Historial de puntos (cada transacción)
create table if not exists public.puntos_historial (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.crew_members(id) on delete cascade,
  puntos      integer not null,               -- positivo = ganados, negativo = canjeados
  motivo      text not null,                  -- 'registro', 'compra', 'instagram', 'referido', 'cumpleanos', 'promo'
  metadata    jsonb,                          -- datos extra (ej: id pedido, monto)
  created_at  timestamptz default now()
);

-- 3. Pedidos / pagos
create table if not exists public.pedidos (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid references public.crew_members(id),
  stripe_payment_id   text,
  monto               integer,                -- en céntimos
  moneda              text default 'eur',
  tipo                text,                   -- 'delivery', 'takeaway', 'sala', 'marketplace'
  estado              text default 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  items               jsonb,                  -- productos del pedido
  created_at          timestamptz default now()
);

-- 4. Promos generadas automáticamente
create table if not exists public.promos (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid references public.crew_members(id) on delete cascade,
  codigo        text unique not null,
  descuento     integer not null,             -- porcentaje ej: 15
  motivo        text,                         -- 'puntos_100', 'inactividad_30d', 'cumpleanos'
  usado         boolean default false,
  expires_at    timestamptz,
  created_at    timestamptz default now()
);

-- 5. Contactos / leads (formulario de contacto y franquiciados)
create table if not exists public.contactos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text,
  email       text not null,
  telefono    text,
  tipo        text default 'contacto',       -- 'contacto', 'franquiciado', 'catering'
  mensaje     text,
  ciudad      text,
  estado      text default 'nuevo',          -- 'nuevo', 'contactado', 'cerrado'
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) — seguridad básica
-- ============================================================

alter table public.crew_members enable row level security;
alter table public.puntos_historial enable row level security;
alter table public.pedidos enable row level security;
alter table public.promos enable row level security;
alter table public.contactos enable row level security;

-- El server (service_role) puede hacer todo — las políticas solo aplican al anon key
-- Lectura pública del propio perfil (por member_code, sin auth por ahora)
create policy "Leer propio perfil" on public.crew_members
  for select using (true);

create policy "Leer historial propio" on public.puntos_historial
  for select using (true);

create policy "Leer promos propias" on public.promos
  for select using (true);

-- Insertar desde el server (el service_role bypasea RLS igualmente)
create policy "Insertar miembros" on public.crew_members
  for insert with check (true);

create policy "Insertar historial" on public.puntos_historial
  for insert with check (true);

create policy "Insertar pedidos" on public.pedidos
  for insert with check (true);

create policy "Insertar promos" on public.promos
  for insert with check (true);

create policy "Insertar contactos" on public.contactos
  for insert with check (true);

-- ============================================================
-- Función automática: actualizar nivel según puntos
-- ============================================================
create or replace function public.actualizar_nivel()
returns trigger language plpgsql as $$
begin
  if new.puntos >= 500 then
    new.nivel := 'FOUNDERS';
  elsif new.puntos >= 200 then
    new.nivel := 'HIGH CREW';
  elsif new.puntos >= 50 then
    new.nivel := 'CREW';
  else
    new.nivel := 'NEOPHYTE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger trg_actualizar_nivel
  before update of puntos on public.crew_members
  for each row execute function public.actualizar_nivel();
