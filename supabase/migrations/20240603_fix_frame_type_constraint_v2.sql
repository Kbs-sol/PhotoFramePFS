-- Migration: Fix product_variants.frame_type constraint safely
-- Run this script in Supabase SQL editor (idempotent)

-- 1. Drop existing frame_type constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_variants' AND constraint_name = 'product_variants_frame_type_check'
  ) THEN
    ALTER TABLE product_variants DROP CONSTRAINT product_variants_frame_type_check;
  END IF;
END $$;

-- 2. Update all rows to a valid frame_type ('Direct Frame')
UPDATE product_variants
SET frame_type = 'Direct Frame'
WHERE frame_type IS NULL OR frame_type NOT IN ('Direct Frame', 'Mount Frame');

-- 3. Add constraint allowing only Direct Frame and Mount Frame
ALTER TABLE product_variants
ADD CONSTRAINT product_variants_frame_type_check CHECK (frame_type IN ('Direct Frame', 'Mount Frame'));

-- Note: All rows now conform to the constraint.
