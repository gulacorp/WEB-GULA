-- Uber Eats integration tables

-- OAuth token cache
create table if not exists public.uber_eats_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz default now()
);

-- API call log
create table if not exists public.uber_eats_log (
  id uuid primary key default gen_random_uuid(),
  endpoint text,
  store_id text,
  status int,
  fetched_at timestamptz default now()
);

-- Webhook raw events
create table if not exists public.uber_eats_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  payload jsonb,
  received_at timestamptz default now()
);

-- Parsed orders
create table if not exists public.uber_eats_orders (
  id uuid primary key default gen_random_uuid(),
  uber_order_id text unique not null,
  store_id text,
  status text,
  total_price numeric,
  currency text default 'EUR',
  items jsonb default '[]',
  customer_name text,
  placed_at timestamptz,
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists uber_eats_orders_placed_at_idx on public.uber_eats_orders(placed_at desc);
create index if not exists uber_eats_orders_status_idx on public.uber_eats_orders(status);

-- RLS: only service role reads/writes
alter table public.uber_eats_tokens enable row level security;
alter table public.uber_eats_log enable row level security;
alter table public.uber_eats_events enable row level security;
alter table public.uber_eats_orders enable row level security;

create policy "service_role only" on public.uber_eats_tokens for all to service_role using (true) with check (true);
create policy "service_role only" on public.uber_eats_log for all to service_role using (true) with check (true);
create policy "service_role only" on public.uber_eats_events for all to service_role using (true) with check (true);
create policy "service_role only" on public.uber_eats_orders for all to service_role using (true) with check (true);

-- Authenticated users (admin) can read orders
create policy "admin read orders" on public.uber_eats_orders for select to authenticated using (true);
