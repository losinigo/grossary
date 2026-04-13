-- ============================================================
-- Grossary Database Schema
-- Run this in Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- 1. Extensions
-- ============================================================
create extension if not exists "cube";
create extension if not exists "earthdistance";

-- 2. Tables
-- ============================================================

-- User profiles (auto-created on signup via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  reputation_score int default 0 not null,
  created_at timestamptz default now() not null
);

-- Grocery products
create table products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  brand text,
  category text,
  created_by uuid references profiles(id),
  created_at timestamptz default now() not null
);

-- Grocery stores
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now() not null
);

-- Price entries (append-only log — every submission is a new row)
create table prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric(10,2) not null check (price >= 0),
  user_id uuid not null references profiles(id),
  proof_image_url text,
  is_available boolean default true not null,
  created_at timestamptz default now() not null
);

-- Price confirmations by other users
create table confirmations (
  id uuid primary key default gen_random_uuid(),
  price_id uuid not null references prices(id) on delete cascade,
  user_id uuid not null references profiles(id),
  confirmed boolean not null default true,
  created_at timestamptz default now() not null,
  unique(price_id, user_id) -- one confirmation per user per price
);

-- 3. Indexes
-- ============================================================

-- Product search
create index idx_products_name on products using gin (to_tsvector('english', name));
create index idx_products_barcode on products (barcode) where barcode is not null;

-- Store geolocation (for earthdistance queries)
create index idx_stores_location on stores using gist (ll_to_earth(latitude, longitude));

-- Price lookups
create index idx_prices_product_store on prices (product_id, store_id, created_at desc);
create index idx_prices_store on prices (store_id);
create index idx_prices_created on prices (created_at desc);

-- Confirmation lookups
create index idx_confirmations_price on confirmations (price_id);

-- 4. Views
-- ============================================================

-- Latest price per product+store combo
create or replace view current_prices as
select distinct on (product_id, store_id)
  p.id,
  p.product_id,
  p.store_id,
  p.price,
  p.user_id,
  p.proof_image_url,
  p.is_available,
  p.created_at,
  pr.display_name as contributor_name,
  (
    select count(*) filter (where c.confirmed = true)
    from confirmations c
    where c.price_id = p.id
  ) as confirmation_count
from prices p
left join profiles pr on pr.id = p.user_id
order by product_id, store_id, p.created_at desc;

-- 5. Functions
-- ============================================================

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Find nearby stores with distance (in km)
create or replace function nearby_stores(
  user_lat double precision,
  user_lon double precision,
  radius_km double precision default 10
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  distance_km double precision
)
language sql stable
as $$
  select
    s.id,
    s.name,
    s.address,
    s.latitude,
    s.longitude,
    round((earth_distance(
      ll_to_earth(user_lat, user_lon),
      ll_to_earth(s.latitude, s.longitude)
    ) / 1000)::numeric, 2)::double precision as distance_km
  from stores s
  where earth_box(ll_to_earth(user_lat, user_lon), radius_km * 1000) @> ll_to_earth(s.latitude, s.longitude)
  order by distance_km;
$$;

-- Search products with fuzzy matching
create or replace function search_products(search_term text)
returns setof products
language sql stable
as $$
  select *
  from products
  where
    to_tsvector('english', name) @@ plainto_tsquery('english', search_term)
    or name ilike '%' || search_term || '%'
    or brand ilike '%' || search_term || '%'
    or barcode = search_term
  order by
    ts_rank(to_tsvector('english', name), plainto_tsquery('english', search_term)) desc
  limit 50;
$$;

-- Search products at nearby stores with prices
create or replace function search_products_nearby(
  search_term text,
  user_lat double precision,
  user_lon double precision,
  radius_km double precision default 10
)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  barcode text,
  store_id uuid,
  store_name text,
  store_address text,
  price numeric,
  is_available boolean,
  price_updated_at timestamptz,
  contributor_name text,
  confirmation_count bigint,
  distance_km double precision
)
language sql stable
as $$
  select
    cp.product_id,
    prod.name as product_name,
    prod.brand,
    prod.barcode,
    cp.store_id,
    ns.name as store_name,
    ns.address as store_address,
    cp.price,
    cp.is_available,
    cp.created_at as price_updated_at,
    cp.contributor_name,
    cp.confirmation_count,
    ns.distance_km
  from current_prices cp
  join products prod on prod.id = cp.product_id
  join nearby_stores(user_lat, user_lon, radius_km) ns on ns.id = cp.store_id
  where
    to_tsvector('english', prod.name) @@ plainto_tsquery('english', search_term)
    or prod.name ilike '%' || search_term || '%'
    or prod.brand ilike '%' || search_term || '%'
    or prod.barcode = search_term
  order by cp.price asc, ns.distance_km asc;
$$;

-- Increment reputation when user contributes
create or replace function increment_reputation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set reputation_score = reputation_score + 1
  where id = new.user_id;
  return new;
end;
$$;

create or replace trigger on_price_added
  after insert on public.prices
  for each row execute function increment_reputation();

create or replace trigger on_confirmation_added
  after insert on public.confirmations
  for each row execute function increment_reputation();

-- Increment reputation for product additions
create or replace function increment_reputation_created_by()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set reputation_score = reputation_score + 1
  where id = new.created_by;
  return new;
end;
$$;

create or replace trigger on_product_added
  after insert on public.products
  for each row execute function increment_reputation_created_by();

create or replace trigger on_store_added
  after insert on public.stores
  for each row execute function increment_reputation_created_by();

-- 6. Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table products enable row level security;
alter table stores enable row level security;
alter table prices enable row level security;
alter table confirmations enable row level security;

-- Profiles: anyone can read, users can update their own
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Products: anyone can read, authenticated users can insert
create policy "products_select" on products for select using (true);
create policy "products_insert" on products for insert with check (auth.uid() is not null);

-- Stores: anyone can read, authenticated users can insert
create policy "stores_select" on stores for select using (true);
create policy "stores_insert" on stores for insert with check (auth.uid() is not null);

-- Prices: anyone can read, authenticated users can insert their own
create policy "prices_select" on prices for select using (true);
create policy "prices_insert" on prices for insert with check (auth.uid() = user_id);

-- Confirmations: anyone can read, authenticated users can insert their own
create policy "confirmations_select" on confirmations for select using (true);
create policy "confirmations_insert" on confirmations for insert with check (auth.uid() = user_id);

-- 7. Storage bucket for proof images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('proof-images', 'proof-images', true)
on conflict (id) do nothing;

create policy "proof_images_select" on storage.objects for select using (bucket_id = 'proof-images');
create policy "proof_images_insert" on storage.objects for insert with check (bucket_id = 'proof-images' and auth.uid() is not null);
