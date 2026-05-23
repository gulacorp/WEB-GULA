-- Waitlist table for Club GULA pre-launch
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text default 'pending' check (status in ('pending', 'notified', 'registered')),
  created_at timestamptz default now(),
  notified_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- Index for faster lookups
create index if not exists waitlist_email_idx on public.waitlist(email);
create index if not exists waitlist_status_idx on public.waitlist(status);
create index if not exists waitlist_created_at_idx on public.waitlist(created_at desc);

-- RLS policies
alter table public.waitlist enable row level security;

-- Allow public inserts (for waitlist form)
create policy "Public can insert into waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Allow service role to read all (for admin/notifications)
create policy "Service role can read all waitlist"
  on public.waitlist for select
  to service_role
  using (true);

-- Allow service role to update (for status changes)
create policy "Service role can update waitlist"
  on public.waitlist for update
  to service_role
  using (true)
  with check (true);

-- Function to handle duplicate emails gracefully
create or replace function public.add_to_waitlist(p_email text)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing_id uuid;
begin
  -- Check if email already exists
  select id into existing_id
  from public.waitlist
  where email = p_email
  limit 1;

  if existing_id is not null then
    return jsonb_build_object(
      'success', false,
      'message', 'Ya estás en la lista de espera',
      'existing', true
    );
  end if;

  -- Insert new waitlist entry
  insert into public.waitlist (email)
  values (p_email)
  returning id into existing_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Añadido a la lista de espera',
    'id', existing_id
  );
end;
$$;

-- Grant execute permission to anon/authenticated
grant execute on function public.add_to_waitlist to anon, authenticated;
