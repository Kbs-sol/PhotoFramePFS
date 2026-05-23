-- Migration: Add brand_name and poster_addon_price to system_config, and restrict frame_type enum safely
-- Run this script in Supabase SQL editor (idempotent)

-- 1. Add brand_name config (default empty)
INSERT INTO system_config (key, value, description)
VALUES ('brand_name', '', 'Brand name used across site and SEO')
ON CONFLICT (key) DO NOTHING;

-- 2. Add poster_addon_price config (default 0)
INSERT INTO system_config (key, value, description)
VALUES ('poster_addon_price', '0', 'Price for Poster add‑on (₹)')
ON CONFLICT (key) DO NOTHING;

-- 3. Clean up existing product_variants frame_type data
-- Set any NULL or unexpected values to a default allowed value (Direct Frame)
UPDATE product_variants
SET frame_type = 'Direct Frame'
WHERE frame_type IS NULL OR frame_type NOT IN ('Direct Frame', 'Mount Frame');

-- 4. Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'product_variants' AND constraint_type = 'CHECK') THEN
    ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_frame_type_check;
  END IF;
END $$;

-- 5. Add new constraint allowing only Direct Frame and Mount Frame
ALTER TABLE product_variants
ADD CONSTRAINT product_variants_frame_type_check CHECK (frame_type IN ('Direct Frame', 'Mount Frame'));

-- Note: Rows have been normalized before applying the constraint.
