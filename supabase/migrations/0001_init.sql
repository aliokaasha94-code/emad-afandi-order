-- Emad Effendi order-ready schema (Supabase / Postgres)
-- Run in Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into branches (slug, name_ar) values ('emad-kafrelsheikh', 'عماد أفندي - كفر الشيخ')
on conflict (slug) do nothing;

do $$ begin
  create type order_status as enum ('received','preparing','ready','picked_up','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id text primary key,
  branch_slug text not null references branches(slug) on delete cascade,
  foodics_order_id text unique,
  order_number text not null,
  items text default '',
  status order_status not null default 'received',
  token_hash text unique,
  estimated_mins int default 8,
  ready_at timestamptz,
  expires_at timestamptz default now() + interval '2 hours',
  created_at timestamptz default now()
);
create index if not exists idx_orders_branch_status on orders(branch_slug, status, created_at);

create table if not exists order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  from_status order_status not null,
  to_status order_status not null,
  actor text not null default 'staff',
  created_at timestamptz default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'foodics',
  event_id text unique not null,
  payload jsonb not null,
  status text not null default 'received',
  created_at timestamptz default now()
);

alter table orders enable row level security;
alter table order_status_events enable row level security;
alter table webhook_events enable row level security;

-- Staff can do everything when authenticated (pilot simple policy).
-- Customer anonymous access goes ONLY through RPC get_order_status (no direct select).
drop policy if exists "staff all" on orders;
create policy "staff all" on orders for all to authenticated using (true) with check (true);
drop policy if exists "staff events" on order_status_events;
create policy "staff events" on order_status_events for all to authenticated using (true) with check (true);

create or replace function get_order_status(p_token_hash text)
returns jsonb language plpgsql security definer as $$
declare r orders%rowtype;
declare ahead int;
begin
  select * into r from orders where token_hash = p_token_hash;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select count(*) into ahead from orders
    where branch_slug = r.branch_slug and status in ('received','preparing') and created_at < r.created_at;
  return jsonb_build_object('ok', true, 'id', r.id, 'order_number', r.order_number,
    'items', r.items, 'status', r.status, 'queue_ahead', ahead,
    'created_at', r.created_at, 'ready_at', r.ready_at);
end $$;
