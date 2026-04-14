-- ============================================================
-- CORRECTED Enhanced Price Estimation - Proper Best Deal Logic
-- Run this in Supabase SQL Editor
-- ============================================================

-- Function to get price estimates with CORRECTED best deal logic
CREATE OR REPLACE FUNCTION get_shopping_list_price_estimates_with_mode(
  list_uuid UUID,
  estimation_mode TEXT DEFAULT 'optimized',
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL,
  radius_km DOUBLE PRECISION DEFAULT 25,
  specific_store_id UUID DEFAULT NULL
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
  is_best_deal BOOLEAN,
  -- Mode-specific data
  avg_price_nearby NUMERIC,
  price_count_nearby INTEGER,
  alternative_stores JSONB
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
  nearby_prices AS (
    SELECT 
      cp.product_id,
      cp.price_per_unit,
      cp.created_at,
      s.id as store_id,
      s.name as store_name,
      s.address as store_address,
      CASE 
        WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
          ROUND((earth_distance(
            ll_to_earth(user_lat, user_lon),
            ll_to_earth(s.latitude, s.longitude)
          ) / 1000)::NUMERIC, 2)::DOUBLE PRECISION
        ELSE NULL
      END as distance_km
    FROM current_prices cp
    JOIN stores s ON s.id = cp.store_id
    WHERE 
      cp.created_at >= NOW() - INTERVAL '30 days'
      AND CASE 
        WHEN user_lat IS NOT NULL AND user_lon IS NOT NULL THEN
          earth_box(ll_to_earth(user_lat, user_lon), radius_km * 1000) @> ll_to_earth(s.latitude, s.longitude)
        ELSE TRUE
      END
      AND CASE 
        WHEN estimation_mode = 'specific_store' AND specific_store_id IS NOT NULL THEN
          s.id = specific_store_id
        ELSE TRUE
      END
  ),
  price_stats AS (
    SELECT 
      np.product_id,
      AVG(np.price_per_unit) as avg_price_nearby,
      COUNT(*)::INTEGER as price_count_nearby,
      MIN(np.price_per_unit) as min_price_nearby,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'store_name', np.store_name,
          'price_per_unit', np.price_per_unit,
          'distance_km', np.distance_km
        ) ORDER BY np.price_per_unit ASC, np.distance_km ASC
      ) FILTER (WHERE np.price_per_unit IS NOT NULL) as alternative_stores
    FROM nearby_prices np
    GROUP BY np.product_id
  ),
  selected_prices AS (
    -- For each product, select the appropriate price based on mode
    SELECT 
      li.product_id,
      CASE 
        WHEN estimation_mode = 'near_me' THEN ps.avg_price_nearby
        WHEN estimation_mode = 'optimized' THEN ps.min_price_nearby  -- Always use minimum for optimized
        ELSE (
          -- For specific_store, get the actual price from that store
          SELECT np.price_per_unit 
          FROM nearby_prices np 
          WHERE np.product_id = li.product_id 
          LIMIT 1
        )
      END as selected_price_per_unit,
      ps.avg_price_nearby,
      ps.price_count_nearby,
      ps.min_price_nearby,
      ps.alternative_stores
    FROM list_items li
    LEFT JOIN price_stats ps ON ps.product_id = li.product_id
  ),
  display_info AS (
    -- Get store info for display based on the selected price
    SELECT DISTINCT ON (sp.product_id)
      sp.product_id,
      sp.selected_price_per_unit,
      sp.avg_price_nearby,
      sp.price_count_nearby,
      sp.min_price_nearby,
      sp.alternative_stores,
      np.created_at as last_updated,
      np.store_name,
      np.store_address,
      np.distance_km,
      -- CORRECTED: Only mark as best deal if this is actually the minimum price AND we're showing the minimum
      (estimation_mode = 'optimized' AND sp.selected_price_per_unit = sp.min_price_nearby) as is_best_deal
    FROM selected_prices sp
    LEFT JOIN nearby_prices np ON np.product_id = sp.product_id
    WHERE 
      CASE 
        WHEN estimation_mode = 'optimized' THEN np.price_per_unit = sp.min_price_nearby
        WHEN estimation_mode = 'specific_store' THEN TRUE
        ELSE TRUE -- near_me can show any store since we're using average
      END
    ORDER BY sp.product_id, np.price_per_unit ASC, np.created_at DESC
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
      WHEN di.selected_price_per_unit IS NOT NULL THEN (di.selected_price_per_unit * li.quantity)
      ELSE NULL
    END as estimated_price,
    di.selected_price_per_unit as price_per_unit,
    di.last_updated,
    di.store_name,
    di.store_address,
    di.distance_km,
    (di.selected_price_per_unit IS NOT NULL) as has_price_data,
    COALESCE(di.is_best_deal, false) as is_best_deal,
    di.avg_price_nearby,
    di.price_count_nearby,
    di.alternative_stores
  FROM list_items li
  LEFT JOIN display_info di ON di.product_id = li.product_id
  ORDER BY li.is_completed ASC, li.item_id;
$$;