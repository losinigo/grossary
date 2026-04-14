-- ============================================================
-- DROP and RECREATE Price Estimation Functions - Fixed Version
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_shopping_list_price_estimates(uuid, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS get_shopping_list_summary(uuid, double precision, double precision, double precision);

-- Function to get recent price estimates for shopping list items (UPDATED)
CREATE OR REPLACE FUNCTION get_shopping_list_price_estimates(
  list_uuid UUID,
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  item_id UUID,
  product_id UUID,
  product_name TEXT,
  product_brand TEXT,
  unit_type TEXT,
  unit_abbreviation TEXT,
  quantity NUMERIC,
  is_completed BOOLEAN,
  notes TEXT,
  -- Price estimation data
  estimated_price NUMERIC,
  price_per_unit NUMERIC,
  last_updated TIMESTAMPTZ,
  store_name TEXT,
  store_address TEXT,
  distance_km DOUBLE PRECISION,
  has_price_data BOOLEAN,
  is_best_deal BOOLEAN
)
LANGUAGE sql STABLE
AS $$
  WITH list_items AS (
    SELECT 
      sli.id as item_id,
      sli.product_id,
      sli.quantity,
      sli.is_completed,
      sli.notes,
      p.name as product_name,
      p.brand as product_brand,
      p.unit_type,
      p.unit_abbreviation
    FROM shopping_list_items sli
    JOIN products p ON p.id = sli.product_id
    WHERE sli.shopping_list_id = list_uuid
  ),
  recent_prices AS (
    -- Get lowest price per product from last 30 days
    SELECT DISTINCT ON (cp.product_id)
      cp.product_id,
      cp.price_per_unit,
      cp.created_at as last_updated,
      s.name as store_name,
      s.address as store_address,
      CASE 
        WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
          ROUND((earth_distance(
            ll_to_earth(user_lat, user_lon),
            ll_to_earth(s.latitude, s.longitude)
          ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION
        ELSE NULL
      END as distance_km,
      -- Check if this is the absolute lowest price available
      (cp.price_per_unit = (
        SELECT MIN(cp2.price_per_unit) 
        FROM current_prices cp2 
        JOIN stores s2 ON s2.id = cp2.store_id
        WHERE cp2.product_id = cp.product_id
        AND cp2.created_at >= NOW() - INTERVAL '30 days'
        AND CASE 
          WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
            earth_box(ll_to_earth(user_lat, user_lon), radius_km * 1000) @> ll_to_earth(s2.latitude, s2.longitude)
          ELSE TRUE
        END
      )) as is_best_deal
    FROM current_prices cp
    JOIN stores s ON s.id = cp.store_id
    WHERE 
      cp.created_at >= NOW() - INTERVAL '30 days'  -- Only last 30 days
      AND CASE 
        WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
          earth_box(ll_to_earth(user_lat, user_lon), radius_km * 1000) @> ll_to_earth(s.latitude, s.longitude)
        ELSE TRUE
      END
    ORDER BY cp.product_id, cp.price_per_unit ASC, cp.created_at DESC  -- Lowest price first, then most recent
  )
  SELECT 
    li.item_id,
    li.product_id,
    li.product_name,
    li.product_brand,
    li.unit_type,
    li.unit_abbreviation,
    li.quantity,
    li.is_completed,
    li.notes,
    -- Calculate estimated total price for this quantity
    CASE 
      WHEN rp.price_per_unit IS NOT NULL THEN (rp.price_per_unit * li.quantity)
      ELSE NULL
    END as estimated_price,
    rp.price_per_unit,
    rp.last_updated,
    rp.store_name,
    rp.store_address,
    rp.distance_km,
    (rp.price_per_unit IS NOT NULL) as has_price_data,
    COALESCE(rp.is_best_deal, false) as is_best_deal
  FROM list_items li
  LEFT JOIN recent_prices rp ON rp.product_id = li.product_id
  ORDER BY li.is_completed ASC, li.item_id;
$$;

-- Function to get shopping list summary with price estimates (UPDATED)
CREATE OR REPLACE FUNCTION get_shopping_list_summary(
  list_uuid UUID,
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  list_id UUID,
  list_name TEXT,
  list_description TEXT,
  total_items INTEGER,
  completed_items INTEGER,
  completion_percentage NUMERIC,
  items_with_prices INTEGER,
  estimated_total NUMERIC,
  estimated_remaining NUMERIC,
  best_deals_count INTEGER
)
LANGUAGE sql STABLE
AS $$
  WITH list_info AS (
    SELECT 
      sl.id,
      sl.name,
      sl.description,
      COUNT(sli.id)::INTEGER as total_items,
      COUNT(sli.id) FILTER (WHERE sli.is_completed = true)::INTEGER as completed_items
    FROM shopping_lists sl
    LEFT JOIN shopping_list_items sli ON sli.shopping_list_id = sl.id
    WHERE sl.id = list_uuid
    GROUP BY sl.id, sl.name, sl.description
  ),
  price_estimates AS (
    SELECT 
      COUNT(*) FILTER (WHERE has_price_data = true)::INTEGER as items_with_prices,
      SUM(estimated_price) FILTER (WHERE estimated_price IS NOT NULL) as estimated_total,
      SUM(estimated_price) FILTER (WHERE estimated_price IS NOT NULL AND is_completed = false) as estimated_remaining,
      COUNT(*) FILTER (WHERE is_best_deal = true)::INTEGER as best_deals_count
    FROM get_shopping_list_price_estimates(list_uuid, user_lat, user_lon, radius_km)
  )
  SELECT 
    li.id,
    li.name,
    li.description,
    li.total_items,
    li.completed_items,
    CASE 
      WHEN li.total_items = 0 THEN 0
      ELSE ROUND((li.completed_items::NUMERIC / li.total_items) * 100, 1)
    END as completion_percentage,
    pe.items_with_prices,
    pe.estimated_total,
    pe.estimated_remaining,
    pe.best_deals_count
  FROM list_info li
  CROSS JOIN price_estimates pe;
$$;