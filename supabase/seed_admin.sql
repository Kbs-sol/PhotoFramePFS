-- PhotoFrameIn Admin Seeding Script
-- Execute this in your Supabase SQL Editor

-- 1. Insert the primary admin into the admin_users table
-- Replace 'your-email@example.com' with your actual email address
INSERT INTO admin_users (email, role, permissions)
VALUES ('your-email@example.com', 'super_admin', '["*"]')
ON CONFLICT (email) DO NOTHING;

-- 2. Enable Row Level Security (RLS) if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow the authenticated user to read their own record (optional, but good for Supabase Auth)
CREATE POLICY "Admins can view their own data" ON admin_users
FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- 4. Set some initial system configurations
INSERT INTO system_config (key, value, description)
VALUES 
  ('checkout_mode', 'shiprocket', 'Options: shiprocket, custom'),
  ('cod_enabled', 'true', 'Enable Cash on Delivery'),
  ('free_shipping_threshold', '799', 'Order subtotal for free shipping'),
  ('prepaid_discount', '50', 'Flat discount for prepaid orders'),
  ('announcement_active', 'true', 'Show top announcement bar'),
  ('announcement_text', 'Free Delivery on orders above ₹799 | COD Available', 'Banner text')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
