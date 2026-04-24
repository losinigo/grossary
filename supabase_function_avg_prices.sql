-- Simple function to get product average prices
CREATE OR REPLACE FUNCTION get_product_averages()
RETURNS TABLE (
  product_id UUID,
  avg_price NUMERIC
) 
LANGUAGE sql
AS $$
  SELECT 
    product_id,
    AVG(price) as avg_price
  FROM prices 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY product_id;
$$;