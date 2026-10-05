-- ============================================================================
-- Northbound storefront schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every object is created with "if not exists" / "or replace".
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles: one row per authenticated user, mirrored from auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Keep profiles in sync with auth.users. Google sign-in fills name/avatar from
-- the OAuth claims. Admin bootstrapping is handled separately (see README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id       uuid primary key default gen_random_uuid(),
  slug     text not null unique,
  name     text not null,
  position integer not null default 0
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  -- Price in the currency's minor unit (kobo for NGN, cents for USD/ZAR...).
  -- Integer money avoids floating-point rounding bugs end to end.
  price       integer not null check (price >= 0),
  compare_at  integer check (compare_at is null or compare_at >= 0),
  category_id uuid references public.categories (id) on delete set null,
  images      text[] not null default '{}',
  is_active   boolean not null default true,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active);

create table if not exists public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size       text not null,
  color      text,
  sku        text not null unique,
  stock      integer not null default 0 check (stock >= 0),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create index if not exists variants_product_idx on public.product_variants (product_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
do $do$ begin
  create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled', 'failed');
exception when duplicate_object then null;
end $do$;

create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique,
  -- Null for guest checkout. Orders are never anonymous: email is always set.
  user_id              uuid references auth.users (id) on delete set null,
  email                text not null,
  status               public.order_status not null default 'pending',
  currency             text not null default 'NGN',
  subtotal             integer not null check (subtotal >= 0),
  shipping_fee         integer not null default 0 check (shipping_fee >= 0),
  total                integer not null check (total >= 0),
  shipping_address     jsonb not null,
  paystack_reference   text unique,
  paid_at              timestamptz,
  fulfilled_at         timestamptz,
  confirmation_sent_at timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_id    uuid references public.products (id) on delete set null,
  -- Denormalised so a receipt stays accurate even if the catalog changes later.
  product_name  text not null,
  variant_label text not null,
  image_url     text,
  unit_price    integer not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Human-friendly order numbers: NB-7F3A2C
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns text language plpgsql as $fn$
declare
  candidate text;
begin
  loop
    candidate := 'NB-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.orders where order_number = candidate);
  end loop;
  return candidate;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Atomic, idempotent payment settlement.
--
-- Returns true only the FIRST time an order moves pending -> paid, so the
-- Paystack webhook and the browser callback can both call it and exactly one
-- of them will send the confirmation email.
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order_id uuid, p_reference text)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_rows int;
  r record;
begin
  update public.orders
     set status = 'paid',
         paid_at = now(),
         paystack_reference = coalesce(p_reference, paystack_reference)
   where id = p_order_id
     and status = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;  -- already settled by the other caller
  end if;

  -- Draw down inventory. greatest(...,0) keeps stock from going negative if a
  -- race slips through; oversell is caught at checkout, before payment starts.
  for r in select variant_id, quantity from public.order_items where order_id = p_order_id loop
    if r.variant_id is not null then
      update public.product_variants
         set stock = greatest(stock - r.quantity, 0)
       where id = r.variant_id;
    end if;
  end loop;

  return true;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Lock down the helper functions.
--
-- PostgREST exposes every function in the `public` schema as an RPC endpoint
-- callable with the anon key, which ships in the browser. mark_order_paid()
-- is SECURITY DEFINER, so without this a signed-in customer could read their
-- own pending order id and settle it without ever paying. Only the service
-- role - used exclusively by server code - may call these.
-- ---------------------------------------------------------------------------
revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
revoke all on function public.generate_order_number() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.mark_order_paid(uuid, text) to service_role;
grant execute on function public.generate_order_number() to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Reads are open for the public catalog and scoped to the owner for orders.
-- ALL writes happen server-side with the service role key, which bypasses RLS,
-- so there are deliberately no insert/update/delete policies here.
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories
  for select using (true);

drop policy if exists "active products are public" on public.products;
create policy "active products are public" on public.products
  for select using (is_active);

drop policy if exists "variants of active products are public" on public.product_variants;
create policy "variants of active products are public" on public.product_variants
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for product imagery (public read, service-role write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images are public" on storage.objects;
create policy "product images are public" on storage.objects
  for select using (bucket_id = 'product-images');
