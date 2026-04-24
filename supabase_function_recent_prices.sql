-- Function to get recent prices with average price comparison
CREATE OR REPLACE FUNCTION get_recent_prices_with_avg(limit_count INTEGER DEFAULT 8)
RETURNS TABLE (
  id BIGINT,
  price NUMERIC,
  created_at TIMESTAMPTZ,
  product_id BIGINT,
  products JSON,
  stores JSON,
  avg_price NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recent_prices AS (
    SELECT 
      p.id,
      p.price,
      p.created_at,
      p.product_id,
      p.store_id,
      ROW_NUMBER() OVER (ORDER BY p.created_at DESC) as rn
    FROM prices p
  ),
  product_averages AS (
    SELECT 
      product_id,
      AVG(price) as avg_price
    FROM prices 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY product_id
  )
  SELECT 
    rp.id,
    rp.price,
    rp.created_at,
    rp.product_id,
    json_build_object('name', prod.name, 'brand', prod.brand) as products,
    json_build_object('name', store.name) as stores,
    COALESCE(pa.avg_price, 0) as avg_price
  FROM recent_prices rp
  LEFT JOIN products prod ON rp.product_id = prod.id
  LEFT JOIN stores store ON rp.store_id = store.id
  LEFT JOIN product_averages pa ON rp.product_id = pa.product_id
  WHERE rp.rn <= limit_count
  ORDER BY rp.created_at DESC;
END;
$$;