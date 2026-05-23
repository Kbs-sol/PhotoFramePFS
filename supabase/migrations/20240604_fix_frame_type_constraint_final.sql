# 20240604_fix_frame_type_constraint_final.sql
-- Migration: Safely enforce frame_type enum on product_variants
-- Run this script in Supabase SQL editor (idempotent)

BEGIN;

-- 1. Drop existing constraint if it exists
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_frame_type_check;

-- 2. Normalize existing data to allowed values
UPDATE product_variants
SET frame_type = 'Direct Frame'
WHERE frame_type IS NULL OR frame_type NOT IN ('Direct Frame', 'Mount Frame');

-- 3. Add the correct constraint allowing only Direct Frame and Mount Frame
ALTER TABLE product_variants
ADD CONSTRAINT product_variants_frame_type_check CHECK (frame_type IN ('Direct Frame', 'Mount Frame'));

COMMIT;
