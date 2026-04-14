-- ============================================================
-- Enhanced Price Estimation Functions - Three Modes Support
-- Run this in Supabase SQL Editor
-- ============================================================

-- Function to get price estimates with different modes
CREATE OR REPLACE FUNCTION get_shopping_list_price_estimates_with_mode(
  list_uuid UUID,
  estimation_mode TEXT DEFAULT 'optimized', -- 'near_me', 'specific_store', 'optimized'
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
      -- For near_me mode: average price
      AVG(np.price_per_unit) as avg_price_nearby,
      COUNT(*)::INTEGER as price_count_nearby,
      -- For optimized mode: lowest price
      MIN(np.price_per_unit) as min_price_nearby,
      -- Alternative stores (top 3 cheapest)
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
    SELECT DISTINCT ON (np.product_id)
      np.product_id,
      CASE 
        WHEN estimation_mode = 'near_me' THEN ps.avg_price_nearby
        WHEN estimation_mode = 'optimized' THEN ps.min_price_nearby
        ELSE np.price_per_unit -- specific_store or fallback
      END as selected_price_per_unit,
      np.created_at as last_updated,
      np.store_name,
      np.store_address,
      np.distance_km,
      ps.avg_price_nearby,
      ps.price_count_nearby,
      ps.alternative_stores,
      -- Check if this is the best deal
      (np.price_per_unit = ps.min_price_nearby) as is_best_deal
    FROM nearby_prices np
    JOIN price_stats ps ON ps.product_id = np.product_id
    WHERE 
      CASE 
        WHEN estimation_mode = 'optimized' THEN np.price_per_unit = ps.min_price_nearby
        WHEN estimation_mode = 'specific_store' THEN TRUE
        ELSE TRUE -- near_me uses average, so any store is fine for display
      END
    ORDER BY np.product_id, 
      CASE 
        WHEN estimation_mode = 'optimized' THEN np.price_per_unit
        ELSE np.created_at
      END ASC
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
      WHEN sp.selected_price_per_unit IS NOT NULL THEN (sp.selected_price_per_unit * li.quantity)
      ELSE NULL
    END as estimated_price,
    sp.selected_price_per_unit as price_per_unit,
    sp.last_updated,
    sp.store_name,
    sp.store_address,
    sp.distance_km,
    (sp.selected_price_per_unit IS NOT NULL) as has_price_data,
    COALESCE(sp.is_best_deal, false) as is_best_deal,
    sp.avg_price_nearby,
    sp.price_count_nearby,
    sp.alternative_stores
  FROM list_items li
  LEFT JOIN selected_prices sp ON sp.product_id = li.product_id
  ORDER BY li.is_completed ASC, li.item_id;
$$;

-- Function to get shopping list summary with different modes
CREATE OR REPLACE FUNCTION get_shopping_list_summary_with_mode(
  list_uuid UUID,
  estimation_mode TEXT DEFAULT 'optimized',
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lon DOUBLE PRECISION DEFAULT NULL,
  radius_km DOUBLE PRECISION DEFAULT 25,
  specific_store_id UUID DEFAULT NULL
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
  best_deals_count INTEGER,
  estimation_mode TEXT,
  store_coverage JSONB
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
      COUNT(*) FILTER (WHERE is_best_deal = true)::INTEGER as best_deals_count,
      -- Store coverage for optimized mode
      JSONB_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'store_name', store_name,
          'items_count', 1
        )
      ) FILTER (WHERE store_name IS NOT NULL) as store_coverage
    FROM get_shopping_list_price_estimates_with_mode(list_uuid, estimation_mode, user_lat, user_lon, radius_km, specific_store_id)
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
    pe.best_deals_count,
    estimation_mode,
    pe.store_coverage
  FROM list_info li
  CROSS JOIN price_estimates pe;
$$;