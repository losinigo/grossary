-- ============================================================
-- Essential Supabase Functions for Grossary App
-- These functions are used by your React hooks
-- ============================================================

-- Function used by useProductAverages() hook
CREATE OR REPLACE FUNCTION get_product_averages()
RETURNS TABLE (
  product_id UUID,
  avg_price NUMERIC
) 
LANGUAGE sql STABLE
AS $$
  SELECT 
    product_id,
    AVG(price) as avg_price
  FROM prices 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY product_id;
$$;

-- Function used by useProductSearch() hook for nearby search
-- (Already defined in schema.sql but included here for reference)
CREATE OR REPLACE FUNCTION search_products_nearby(
  search_term text,
  user_lat double precision,
  user_lon double precision,
  radius_km double precision default 10
)
RETURNS TABLE (
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
  contributor_avatar_url text,
  confirmation_count bigint,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
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
  ORDER BY cp.price asc, ns.distance_km asc;
$$;

-- Function used by useProductSearch() hook for regular search
-- (Already defined in schema.sql but included here for reference)
CREATE OR REPLACE FUNCTION search_products(search_term text)
RETURNS SETOF products
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM products
  WHERE
    to_tsvector('english', name) @@ plainto_tsquery('english', search_term)
    or name ilike '%' || search_term || '%'
    or brand ilike '%' || search_term || '%'
    or barcode = search_term
  ORDER BY
    ts_rank(to_tsvector('english', name), plainto_tsquery('english', search_term)) desc
  LIMIT 50;
$$;