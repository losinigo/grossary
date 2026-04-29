-- Restrict product image uploads to premium/admin users only
-- Run this in Supabase SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;

-- Create new policy that checks user role
CREATE POLICY "product_images_insert" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('premium', 'admin')
  )
);