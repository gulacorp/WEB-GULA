-- ============================================================
-- GULA — Migración 003 · Tabla maestra de envíos
-- Aplicar después de 001 (setup) y 002 (journey)
-- ============================================================
--
-- Objetivo: tener UN solo sitio donde ver todo lo que entra
-- desde la web: registros del Club, contactos, franquiciados,
-- pedidos, reservas, NPS.
--
-- Cómo funciona: triggers automáticos en cada tabla origen
-- replican el envío en `submissions`. El server.js NO se toca.
--
-- ============================================================

-- ─── 1. Tabla maestra ───────────────────────────────────────
create table if not exists public.submissions (
  id              bigserial primary key,
  type            text not null,                        -- club_signup | contact | franchise | reservation | nps | order
  source_table    text not null,                        -- crew_members | contactos | reservations | nps_responses | pedidos
  source_id       text not null,                        -- id en la tabla origen (uuid o bigint como texto)
  member_id       uuid references public.crew_members(id) on delete set null,
  member_code     text,                                 -- GULA-XXNNNN si lo hay
  nombre          text,
  email           text,
  telefono        text,
  ciudad          text,
  store           text,                                 -- mostoles | valencia | cartagena | sevilla | null
  payload         jsonb not null default '{}'::jsonb,   -- objeto completo del registro origen
  utm             jsonb,                                -- atribución de marketing si está disponible
  created_at      timestamptz default now()
);

create index if not exists idx_subs_type        on public.submissions(type);
create index if not exists idx_subs_source      on public.submissions(source_table, source_id);
create index if not exists idx_subs_member      on public.submissions(member_id);
create index if not exists idx_subs_email       on public.submissions(email);
create index if not exists idx_subs_created     on public.submissions(created_at desc);

alter table public.submissions enable row level security;
drop policy if exists "Leer submissions"     on public.submissions;
drop policy if exists "Insertar submissions" on public.submissions;
create policy "Leer submissions"     on public.submissions for select using (true);
create policy "Insertar submissions" on public.submissions for insert with check (true);

-- ─── 2. Trigger: crew_members → submissions ────────────────
create or replace function public.mirror_crew_to_submissions()
returns trigger language plpgsql as $$
begin
  insert into public.submissions
    (type, source_table, source_id, member_id, member_code, nombre, email, telefono, ciudad, store, payload)
  values
    ('club_signup', 'crew_members', new.id::text, new.id, new.member_code,
     trim(coalesce(new.nombre, '') || ' ' || coalesce(new.apellido, '')),
     new.email, new.telefono, new.zip, new.home_store,
     jsonb_build_object(
       'puntos', new.puntos,
       'nivel', new.nivel,
       'followed_ig', new.followed_ig,
       'referido_por', new.referido_por,
       'acquisition_source', new.acquisition_source,
       'referral_code', new.referral_code
     ));
  return new;
end;
$$;

drop trigger if exists trg_mirror_crew_submissions on public.crew_members;
create trigger trg_mirror_crew_submissions
  after insert on public.crew_members
  for each row execute function public.mirror_crew_to_submissions();

-- ─── 3. Trigger: contactos → submissions ───────────────────
create or replace function public.mirror_contactos_to_submissions()
returns trigger language plpgsql as $$
declare
  sub_type text;
begin
  sub_type := case
    when new.tipo = 'franquiciado' then 'franchise'
    when new.tipo = 'catering'     then 'catering'
    else 'contact'
  end;

  insert into public.submissions
    (type, source_table, source_id, nombre, email, telefono, ciudad, payload)
  values
    (sub_type, 'contactos', new.id::text,
     new.nombre, new.email, new.telefono, new.ciudad,
     jsonb_build_object(
       'tipo', new.tipo,
       'mensaje', new.mensaje,
       'estado', new.estado
     ));
  return new;
end;
$$;

drop trigger if exists trg_mirror_contactos_submissions on public.contactos;
create trigger trg_mirror_contactos_submissions
  after insert on public.contactos
  for each row execute function public.mirror_contactos_to_submissions();

-- ─── 4. Trigger: reservations → submissions ────────────────
create or replace function public.mirror_reservations_to_submissions()
returns trigger language plpgsql as $$
begin
  insert into public.submissions
    (type, source_table, source_id, member_id, nombre, telefono, store, payload)
  values
    ('reservation', 'reservations', new.id::text, new.member_id,
     new.nombre, new.telefono, new.store,
     jsonb_build_object(
       'fecha', new.fecha,
       'franja', new.franja,
       'personas', new.personas,
       'notas', new.notas,
       'estado', new.estado
     ));
  return new;
end;
$$;

drop trigger if exists trg_mirror_reservations_submissions on public.reservations;
create trigger trg_mirror_reservations_submissions
  after insert on public.reservations
  for each row execute function public.mirror_reservations_to_submissions();

-- ─── 5. Trigger: nps_responses → submissions ───────────────
create or replace function public.mirror_nps_to_submissions()
returns trigger language plpgsql as $$
begin
  insert into public.submissions
    (type, source_table, source_id, member_id, store, payload)
  values
    ('nps', 'nps_responses', new.id::text, new.member_id, new.store,
     jsonb_build_object(
       'score', new.score,
       'comment', new.comment
     ));
  return new;
end;
$$;

drop trigger if exists trg_mirror_nps_submissions on public.nps_responses;
create trigger trg_mirror_nps_submissions
  after insert on public.nps_responses
  for each row execute function public.mirror_nps_to_submissions();

-- ─── 6. Trigger: pedidos → submissions ─────────────────────
create or replace function public.mirror_pedidos_to_submissions()
returns trigger language plpgsql as $$
begin
  -- Solo registramos pedidos pagados (no los pendientes/fallidos)
  if new.estado = 'paid' and (TG_OP = 'INSERT' or old.estado is distinct from 'paid') then
    insert into public.submissions
      (type, source_table, source_id, member_id, payload)
    values
      ('order', 'pedidos', new.id::text, new.member_id,
       jsonb_build_object(
         'monto', new.monto,
         'moneda', new.moneda,
         'tipo', new.tipo,
         'stripe_payment_id', new.stripe_payment_id,
         'items', new.items
       ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mirror_pedidos_insert on public.pedidos;
create trigger trg_mirror_pedidos_insert
  after insert on public.pedidos
  for each row execute function public.mirror_pedidos_to_submissions();

drop trigger if exists trg_mirror_pedidos_update on public.pedidos;
create trigger trg_mirror_pedidos_update
  after update on public.pedidos
  for each row execute function public.mirror_pedidos_to_submissions();

-- ─── 7. Vista resumen para el dashboard CEO ────────────────
create or replace view public.v_submissions_summary as
select
  date_trunc('day', created_at) as day,
  type,
  count(*) as total
from public.submissions
group by 1, 2
order by 1 desc, 2;
