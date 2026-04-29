-- Admin policies for product management
-- Run this in Supabase SQL Editor

-- Allow admins to update products
CREATE POLICY "products_update" ON products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete products
CREATE POLICY "products_delete" ON products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);