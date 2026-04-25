-- Add is_hidden flag to products for upsell-only items
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Update existing A4 mini prints or low-priced items to be hidden from main grid
-- This is a heuristic update. Admin can toggle this later.
UPDATE products 
SET is_hidden = TRUE 
WHERE id IN (
  SELECT product_id 
  FROM product_variants 
  WHERE price <= 199 AND size = 'A4'
);
