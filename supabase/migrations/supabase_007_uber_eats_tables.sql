-- Uber Eats integration tables
create table if not exists public.uber_eats_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz default now()
);

create table if not exists public.uber_eats_log (
  id uuid primary key default gen_random_uuid(),
  endpoint text,
  store_id text,
  status int,
  fetched_at timestamptz default now()
);

create table if not exists public.uber_eats_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  payload jsonb,
  received_at timestamptz default now()
);

create table if not exists public.uber_eats_orders (
  id uuid primary key default gen_random_uuid(),
  uber_order_id text unique not null,
  store_id text,
  status text,
  total_price numeric,
  currency text default 'EUR',
  items jsonb default '[]'::jsonb,
  customer_name text,
  placed_at timestamptz,
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists uber_eats_orders_placed_at_idx on public.uber_eats_orders(placed_at desc);

-- RLS policies
alter table public.uber_eats_tokens enable row level security;
alter table public.uber_eats_log enable row level security;
alter table public.uber_eats_events enable row level security;
alter table public.uber_eats_orders enable row level security;

-- Service role access for webhooks
create policy "Service role can manage uber_eats_tokens" on public.uber_eats_tokens for all using (auth.role() = 'service_role');
create policy "Service role can manage uber_eats_log" on public.uber_eats_log for all using (auth.role() = 'service_role');
create policy "Service role can manage uber_eats_events" on public.uber_eats_events for all using (auth.role() = 'service_role');
create policy "Service role can manage uber_eats_orders" on public.uber_eats_orders for all using (auth.role() = 'service_role');

-- Admin read access
create policy "Admins can read uber data" on public.uber_eats_orders for select using (
  exists (select 1 from public.admin_users where email = auth.email() and active = true)
);
create policy "Admins can read uber logs" on public.uber_eats_log for select using (
  exists (select 1 from public.admin_users where email = auth.email() and active = true)
);
create policy "Admins can read uber events" on public.uber_eats_events for select using (
  exists (select 1 from public.admin_users where email = auth.email() and active = true)
);
