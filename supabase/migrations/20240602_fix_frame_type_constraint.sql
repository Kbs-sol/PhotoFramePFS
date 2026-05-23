-- Migration: Normalize product_variants.frame_type and enforce allowed values
-- Run this script in Supabase SQL editor (idempotent)

-- 1. Ensure all frame_type values are set to a valid option
UPDATE product_variants
SET frame_type = 'Direct Frame';

-- 2. Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_variants' AND constraint_name = 'product_variants_frame_type_check'
  ) THEN
    ALTER TABLE product_variants DROP CONSTRAINT product_variants_frame_type_check;
  END IF;
END $$;

-- 3. Add new constraint allowing only Direct Frame and Mount Frame
ALTER TABLE product_variants
ADD CONSTRAINT product_variants_frame_type_check CHECK (frame_type IN ('Direct Frame', 'Mount Frame'));

-- Note: All existing rows have been set to 'Direct Frame', which satisfies the constraint.
