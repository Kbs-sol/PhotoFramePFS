-- Unified Migration Script for PhotoFrameIn V3
-- Execute this in Supabase SQL Editor

-- 1. Add columns to products for visibility control
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. Add columns to orders for logistics details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_label_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2);

-- 3. Set default configuration
-- Assuming system_config table is used as the store for app-level settings
INSERT INTO system_config (key, value, description)
VALUES ('checkout_mode', 'custom', 'Default checkout flow: custom or shiprocket')
ON CONFLICT (key) DO UPDATE SET value = 'custom', updated_at = NOW();

-- 4. Apply heuristic: Hide low-margin A4 products from the shop grid
UPDATE products SET is_hidden = TRUE 
WHERE name ILIKE '%A4%' AND price < 150;

-- 5. Seed Admin User (Optional/Manual verification required)
-- INSERT INTO admin_users (email, role) VALUES ('admin@photoframe.in', 'superadmin') ON CONFLICT DO NOTHING;
