-- ============================================================
-- FINAL CORRECTED Schema Updates for Weighted Items Support
-- Run this in Supabase SQL Editor after your existing schema
-- ============================================================

-- Add unit fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'piece' CHECK (unit_type IN ('piece', 'weight', 'volume')),
ADD COLUMN IF NOT EXISTS unit_name TEXT DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS unit_abbreviation TEXT DEFAULT 'pc';

-- Add unit fields to prices table  
ALTER TABLE prices
ADD COLUMN IF NOT EXISTS unit_quantity NUMERIC(10,3) DEFAULT 1.0 CHECK (unit_quantity > 0),
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(10,2) GENERATED ALWAYS AS (price / unit_quantity) STORED;

-- Drop and recreate current_prices view to include unit information
DROP VIEW IF EXISTS current_prices;

CREATE VIEW current_prices AS
SELECT DISTINCT ON (product_id, store_id)
  p.id,
  p.product_id,
  p.store_id,
  p.price,
  p.unit_quantity,
  p.price_per_unit,
  p.user_id,
  p.proof_image_url,
  p.is_available,
  p.created_at,
  pr.display_name as contributor_name,
  pr.avatar_url as contributor_avatar_url,
  (
    SELECT count(*) filter (where c.confirmed = true)
    FROM confirmations c
    WHERE c.price_id = p.id
  ) as confirmation_count
FROM prices p
LEFT JOIN profiles pr on pr.id = p.user_id
ORDER BY product_id, store_id, p.created_at desc;

-- Drop the existing function first
DROP FUNCTION IF EXISTS search_products_nearby(text, double precision, double precision, double precision);

-- Recreate search function with unit information
CREATE OR REPLACE FUNCTION search_products_nearby(
  search_term text,
  user_lat double precision,
  user_lon double precision,
  radius_km double precision default 10
)
RETURNS table (
  product_id uuid,
  product_name text,
  brand text,
  barcode text,
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
LANGUAGE sql stable
AS $$
  SELECT
    cp.product_id,
    prod.name as product_name,
    prod.brand,
    prod.barcode,
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
  FROM current_prices cp
  JOIN products prod on prod.id = cp.product_id
  JOIN nearby_stores(user_lat, user_lon, radius_km) ns on ns.id = cp.store_id
  WHERE
    to_tsvector('english', prod.name) @@ plainto_tsquery('english', search_term)
    or prod.name ilike '%' || search_term || '%'
    or prod.brand ilike '%' || search_term || '%'
    or prod.barcode = search_term
  ORDER BY cp.price_per_unit asc, ns.distance_km asc;
$$;

-- Add some common unit presets (only if they don't exist)
INSERT INTO products (name, brand, unit_type, unit_name, unit_abbreviation, created_by) 
SELECT 'Ground Beef Lean', NULL, 'weight', 'kilogram', 'kg', NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Ground Beef Lean');

INSERT INTO products (name, brand, unit_type, unit_name, unit_abbreviation, created_by) 
SELECT 'Regular Potatoes', NULL, 'weight', 'kilogram', 'kg', NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Regular Potatoes');

INSERT INTO products (name, brand, unit_type, unit_name, unit_abbreviation, created_by) 
SELECT 'Chicken Breast', NULL, 'weight', 'kilogram', 'kg', NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Chicken Breast');

INSERT INTO products (name, brand, unit_type, unit_name, unit_abbreviation, created_by) 
SELECT 'Tomatoes', NULL, 'weight', 'kilogram', 'kg', NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Tomatoes');

INSERT INTO products (name, brand, unit_type, unit_name, unit_abbreviation, created_by) 
SELECT 'Onions', NULL, 'weight', 'kilogram', 'kg', NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Onions');