-- ============================================================
-- Shopping Lists Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Shopping lists table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT FALSE, -- for recurring lists
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shopping list items table
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1.0 CHECK (quantity > 0),
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT, -- user notes like "get the organic one"
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate products in same list
  UNIQUE(shopping_list_id, product_id)
);

-- Indexes for performance
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_updated_at ON shopping_lists(updated_at DESC);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_product_id ON shopping_list_items(product_id);
CREATE INDEX idx_shopping_list_items_completed ON shopping_list_items(is_completed);

-- Update shopping list timestamp when items change
CREATE OR REPLACE FUNCTION update_shopping_list_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.shopping_lists 
  SET updated_at = NOW() 
  WHERE id = COALESCE(NEW.shopping_list_id, OLD.shopping_list_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers to update list timestamp
CREATE TRIGGER shopping_list_items_update_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_shopping_list_timestamp();

-- View for shopping lists with item counts and completion stats
CREATE VIEW shopping_lists_with_stats AS
SELECT 
  sl.id,
  sl.name,
  sl.description,
  sl.user_id,
  sl.is_template,
  sl.created_at,
  sl.updated_at,
  COALESCE(stats.total_items, 0) as total_items,
  COALESCE(stats.completed_items, 0) as completed_items,
  CASE 
    WHEN COALESCE(stats.total_items, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(stats.completed_items, 0)::NUMERIC / stats.total_items) * 100, 1)
  END as completion_percentage
FROM shopping_lists sl
LEFT JOIN (
  SELECT 
    shopping_list_id,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_items
  FROM shopping_list_items
  GROUP BY shopping_list_id
) stats ON sl.id = stats.shopping_list_id;

-- View for shopping list items with product details
CREATE VIEW shopping_list_items_with_products AS
SELECT 
  sli.id,
  sli.shopping_list_id,
  sli.product_id,
  sli.quantity,
  sli.is_completed,
  sli.notes,
  sli.added_at,
  sli.completed_at,
  p.name as product_name,
  p.brand as product_brand,
  p.unit_type,
  p.unit_name,
  p.unit_abbreviation,
  p.barcode
FROM shopping_list_items sli
JOIN products p ON p.id = sli.product_id;

-- Row Level Security
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Shopping lists: users can only access their own lists
CREATE POLICY "shopping_lists_select" ON shopping_lists 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "shopping_lists_insert" ON shopping_lists 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shopping_lists_update" ON shopping_lists 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "shopping_lists_delete" ON shopping_lists 
  FOR DELETE USING (auth.uid() = user_id);

-- Shopping list items: users can only access items from their own lists
CREATE POLICY "shopping_list_items_select" ON shopping_list_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "shopping_list_items_insert" ON shopping_list_items 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "shopping_list_items_update" ON shopping_list_items 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "shopping_list_items_delete" ON shopping_list_items 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl 
      WHERE sl.id = shopping_list_id AND sl.user_id = auth.uid()
    )
  );

-- Function to get shopping lists for a user
CREATE OR REPLACE FUNCTION get_user_shopping_lists(user_uuid UUID)
RETURNS SETOF shopping_lists_with_stats
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM shopping_lists_with_stats 
  WHERE user_id = user_uuid 
  ORDER BY updated_at DESC;
$$;

-- Function to get items for a shopping list
CREATE OR REPLACE FUNCTION get_shopping_list_items(list_uuid UUID)
RETURNS SETOF shopping_list_items_with_products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM shopping_list_items_with_products 
  WHERE shopping_list_id = list_uuid 
  ORDER BY is_completed ASC, added_at ASC;
$$;