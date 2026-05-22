-- ============================================================
-- GULA · Phase 2.5 · CMS bloques + costes producto + combos +
-- misiones + eventos + lecturas blog desde dashboard
-- ============================================================

-- 1. Bloques editables de páginas (CMS por bloques)
create table if not exists page_blocks (
  id uuid primary key default gen_random_uuid(),
  page text not null,           -- 'home', 'marketplace', 'CLUBGULA', 'contacto', 'franquiciado', 'blog/<slug>'
  block_key text not null,      -- 'hero.title', 'hero.subtitle', 'cta.primary', 'image.hero', 'font.headline'
  block_type text not null default 'text', -- 'text','html','image','font','color','json'
  value text,
  meta jsonb default '{}'::jsonb,
  active boolean default true,
  updated_at timestamptz default now(),
  updated_by text,
  unique (page, block_key)
);
alter table page_blocks enable row level security;
drop policy if exists "page_blocks_public_read" on page_blocks;
create policy "page_blocks_public_read" on page_blocks for select using (active = true);
drop policy if exists "page_blocks_admin_all" on page_blocks;
create policy "page_blocks_admin_all" on page_blocks for all using (is_gula_admin()) with check (is_gula_admin());

-- 2. Costes y rentabilidad por producto (modelo calculadora)
create table if not exists product_costs (
  product_id uuid primary key references products(id) on delete cascade,
  cost_base numeric default 0,
  cost_inflation_percent numeric default 15,
  channel_commission_percent numeric default 0,
  notes text,
  updated_at timestamptz default now()
);
alter table product_costs enable row level security;
drop policy if exists "product_costs_admin_all" on product_costs;
create policy "product_costs_admin_all" on product_costs for all using (is_gula_admin()) with check (is_gula_admin());
drop policy if exists "product_costs_public_read" on product_costs;
create policy "product_costs_public_read" on product_costs for select using (true);

-- 3. Combos y suplementos
create table if not exists combos (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,         -- 'sinner','pleasure_for_2','golden_bite','sin_city'
  name text not null,
  base_price numeric not null,
  description text,
  burgers_qty int default 1,
  drinks_qty int default 1,
  sides_qty int default 1,
  desserts_qty int default 0,
  burger_supplement_applies boolean default true,
  side_supplement_applies boolean default true,
  active boolean default true,
  sort_order int default 0,
  updated_at timestamptz default now()
);
alter table combos enable row level security;
drop policy if exists "combos_public_read" on combos;
create policy "combos_public_read" on combos for select using (active = true);
drop policy if exists "combos_admin_all" on combos;
create policy "combos_admin_all" on combos for all using (is_gula_admin()) with check (is_gula_admin());

create table if not exists combo_supplements (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('burger','side','protein')),
  product_name text not null,
  supplement numeric not null default 0,
  notes text,
  unique (scope, product_name)
);
alter table combo_supplements enable row level security;
drop policy if exists "combo_supp_public_read" on combo_supplements;
create policy "combo_supp_public_read" on combo_supplements for select using (true);
drop policy if exists "combo_supp_admin_all" on combo_supplements;
create policy "combo_supp_admin_all" on combo_supplements for all using (is_gula_admin()) with check (is_gula_admin());

-- 4. Misiones del Club GULA (las publica el admin)
create table if not exists club_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_points int default 0,
  reward_label text,
  cta_label text default 'Participar',
  cta_url text,
  image_url text,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table club_missions enable row level security;
drop policy if exists "missions_public_read" on club_missions;
create policy "missions_public_read" on club_missions for select using (active = true and (ends_at is null or ends_at > now()));
drop policy if exists "missions_admin_all" on club_missions;
create policy "missions_admin_all" on club_missions for all using (is_gula_admin()) with check (is_gula_admin());

-- 5. Eventos del Club / Marca
create table if not exists club_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_image text,
  cta_label text default 'Reservar',
  cta_url text,
  capacity int,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table club_events enable row level security;
drop policy if exists "events_public_read" on club_events;
create policy "events_public_read" on club_events for select using (active = true);
drop policy if exists "events_admin_all" on club_events;
create policy "events_admin_all" on club_events for all using (is_gula_admin()) with check (is_gula_admin());

-- 6. Posts del blog accesibles desde dashboard CLUBGULA
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  cover_image text,
  body_html text,
  category text default 'club',
  reading_minutes int default 3,
  published boolean default true,
  published_at timestamptz default now(),
  updated_at timestamptz default now(),
  sort_order int default 0
);
alter table blog_posts enable row level security;
drop policy if exists "blog_public_read" on blog_posts;
create policy "blog_public_read" on blog_posts for select using (published = true);
drop policy if exists "blog_admin_all" on blog_posts;
create policy "blog_admin_all" on blog_posts for all using (is_gula_admin()) with check (is_gula_admin());

-- 7. Seed de costes y combos según calculadora real GULA
insert into combos (code, name, base_price, description, burgers_qty, drinks_qty, sides_qty, desserts_qty, burger_supplement_applies, side_supplement_applies, sort_order) values
  ('sinner', 'The Sinner Combo', 14.90, 'Burger + Bebida + Nuestras Fritas', 1, 1, 1, 0, false, false, 1),
  ('pleasure_for_2', 'Pleasure for 2', 31.90, '2 Burgers + 2 Bebidas + Entrante para compartir', 2, 2, 1, 0, true, true, 2),
  ('golden_bite', 'The Golden Bite', 20.90, 'Burger + Entrante + Bebida', 1, 1, 1, 0, true, true, 3),
  ('sin_city', 'Sin City Combo', 69.69, '4 Burgers + 4 Bebidas + 2 Entrantes + 2 Postres', 4, 4, 2, 2, true, true, 4)
on conflict (code) do update set base_price = excluded.base_price, description = excluded.description, updated_at = now();

insert into combo_supplements (scope, product_name, supplement) values
  ('burger', 'Gula Cheeseburger', 0.00),
  ('burger', 'The Trufa Corp', 2.00),
  ('burger', 'The Sinner', 2.00),
  ('burger', "The Pope's Burger", 1.00),
  ('burger', 'Buffalo Ranch', 1.00),
  ('burger', 'BBK', 1.00),
  ('burger', 'Spicy V', 1.00),
  ('burger', 'Cheese Bacon', 1.00),
  ('burger', 'The Trufa Corp Chicken', 1.00),
  ('burger', 'Bohemian Chicken', 1.00),
  ('side', 'Nuestras Fritas', 0.00),
  ('side', 'Fritas Trufadas', 0.00),
  ('side', 'Fritas Bacon Queso', 0.00),
  ('side', 'Alitas BBK', 1.50),
  ('side', 'Fritas Buffalo Ranch', 1.00),
  ('protein', 'Pollo Frito al estilo Gula', 1.50)
on conflict (scope, product_name) do update set supplement = excluded.supplement;

-- Vista resumen de rentabilidad por producto
create or replace view v_admin_product_pnl as
select
  p.id, p.title, p.category, p.price as pvp, p.active,
  coalesce(pc.cost_base, 0) as cost_base,
  coalesce(pc.cost_inflation_percent, 15) as inflation_pct,
  coalesce(pc.channel_commission_percent, 0) as commission_pct,
  case when p.price > 0 then ((p.price - coalesce(pc.cost_base,0) - p.price * coalesce(pc.channel_commission_percent,0)/100) / p.price * 100) end as margin_normal,
  case when p.price > 0 then ((p.price - coalesce(pc.cost_base,0)*1.15 - p.price * coalesce(pc.channel_commission_percent,0)/100) / p.price * 100) end as margin_inflated
from products p
left join product_costs pc on pc.product_id = p.id;
grant select on v_admin_product_pnl to authenticated;

create index if not exists idx_blog_posts_published on blog_posts(published, published_at desc);
create index if not exists idx_missions_active on club_missions(active, sort_order);
create index if not exists idx_events_active on club_events(active, starts_at);
create index if not exists idx_page_blocks_page on page_blocks(page, active);
