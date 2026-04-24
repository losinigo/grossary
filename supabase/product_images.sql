-- ============================================================
-- Product image support
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.products
add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_select" on storage.objects;
create policy "product_images_select"
on storage.objects
for select
using (bucket_id = 'product-images');

drop policy if exists "product_images_insert" on storage.objects;
create policy "product_images_insert"
on storage.objects
for insert
with check (bucket_id = 'product-images' and auth.uid() is not null);

drop function if exists public.search_products_nearby(text, double precision, double precision, double precision);

create or replace function public.search_products_nearby(
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
  image_url text,
  unit_type text,
  unit_name text,
  unit_abbreviation text,
  store_id uuid,
  store_name text,
  store_address text,
  price numeric,
  unit_quantity numeric,
  price_per_unit numeric,
  is_available boolean,
  price_updated_at timestamptz,
  contributor_name text,
  contributor_avatar_url text,
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
    prod.image_url,
    prod.unit_type,
    prod.unit_name,
    prod.unit_abbreviation,
    cp.store_id,
    ns.name as store_name,
    ns.address as store_address,
    cp.price,
    cp.unit_quantity,
    cp.price_per_unit,
    cp.is_available,
    cp.created_at as price_updated_at,
    cp.contributor_name,
    cp.contributor_avatar_url,
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
  order by cp.price_per_unit asc nulls last, ns.distance_km asc;
$$;
