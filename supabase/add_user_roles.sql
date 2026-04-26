-- Add role column to profiles table
-- Roles: 'free' (default), 'premium', 'admin'

ALTER TABLE profiles 
ADD COLUMN role text DEFAULT 'free' NOT NULL;

-- Add check constraint to ensure only valid roles
ALTER TABLE profiles
ADD CONSTRAINT check_valid_role CHECK (role IN ('free', 'premium', 'admin'));

-- Index for quick role lookups
CREATE INDEX idx_profiles_role ON profiles(role);

-- You can manually update roles in Supabase dashboard:
-- UPDATE profiles SET role = 'premium' WHERE id = 'user-id-here';
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-id-here';
