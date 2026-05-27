-- ═══════════════════════════════════════════════════════════════════════════
-- ChitraFrame — Consolidated Supabase Migrations
-- Covers: 20240601, 20240602, 20240603, 20240604
-- Run this in Supabase → SQL Editor (or split per section if needed)
-- SAFE to run multiple times — uses IF NOT EXISTS / ON CONFLICT DO UPDATE
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Ensure site_config table exists
-- (safe no-op if already present from master.sql)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2: Insert/upsert brand_name + poster_addon_price keys
-- (20240601_add_brand_and_poster_price_and_modify_frame_type.sql)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO site_config (key, value) VALUES
  ('brand_name',        'ChitraFrame'),
  ('poster_addon_price', '199')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 3: Full ChitraFrame rebrand config upsert
-- (Run once to fix live site title/SEO from Supabase side)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO site_config (key, value) VALUES
  ('seo_title',           'ChitraFrame | Real Glass Photo Frames & Wall Art Online India — chitraframe.in'),
  ('seo_description',     'Buy real glass photo frames online in India. Solid wood moulding, museum-grade prints. Free delivery above ₹899. COD available. Shop ChitraFrame — chitraframe.in'),
  ('announcement_text',   'Real Glass · Real Wood · Free Delivery on orders above ₹899 | COD Available'),
  ('free_shipping_threshold', '899'),
  ('contact_email',       'support@chitraframe.in')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 4: Fix frame_type constraint
-- (20240602 + 20240603_fix_frame_type_constraint_v2.sql)
-- Allows: 'Standard', 'Premium', 'Direct Frame', 'Mount Frame', 'Custom'
-- Drops old constraint (if any) and re-applies safely.
-- ────────────────────────────────────────────────────────────────────────────

-- Step 4a: Drop old enum-style check constraints if they exist
DO $$
BEGIN
  -- Drop any check constraint named like frame_type_check or similar
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'product_variants'
      AND constraint_type = 'CHECK'
      AND constraint_name ILIKE '%frame_type%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE product_variants DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'product_variants'
        AND constraint_type = 'CHECK'
        AND constraint_name ILIKE '%frame_type%'
      LIMIT 1
    );
  END IF;
END $$;

-- Step 4b: Apply new lenient frame_type check
-- Allows the new 'Direct Frame' / 'Mount Frame' values AND legacy 'Standard'/'Premium'
ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS product_variants_frame_type_check;

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_frame_type_check
  CHECK (frame_type IN (
    'Standard',
    'Premium',
    'Direct Frame',
    'Mount Frame',
    'Custom',
    'custom'
  ));

-- Step 4c: Rename any old values if needed (safe no-op if already correct)
UPDATE product_variants
  SET frame_type = 'Direct Frame'
  WHERE frame_type = 'Standard'
    AND EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND p.slug NOT LIKE 'custom%'
    );

-- NOTE: Only uncomment the above UPDATE if you actually want to rename all
-- 'Standard' → 'Direct Frame'. Comment it back out after first run to avoid
-- re-running on subsequent deploys.

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 5: 20240604_fix_frame_type_constraint_final.sql
-- Final safety pass — ensure custom_frame_orders table allows custom values
-- ────────────────────────────────────────────────────────────────────────────

-- If custom_frame_orders has a frame_type column, ensure it allows 'custom'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_frame_orders'
      AND column_name = 'frame_type'
  ) THEN
    -- Drop any existing check on that column
    BEGIN
      EXECUTE (
        SELECT 'ALTER TABLE custom_frame_orders DROP CONSTRAINT ' || constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'custom_frame_orders'
          AND constraint_type = 'CHECK'
          AND constraint_name ILIKE '%frame_type%'
        LIMIT 1
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 6: Verify — run these SELECTs to confirm everything is correct
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT key, value FROM site_config WHERE key IN ('brand_name', 'poster_addon_price', 'seo_title', 'free_shipping_threshold') ORDER BY key;
-- SELECT DISTINCT frame_type FROM product_variants ORDER BY frame_type;
-- SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'product_variants' AND c.contype = 'c';

-- ════════════════════════════════════════════════════════════════════════════
-- END OF CONSOLIDATED MIGRATIONS
-- ════════════════════════════════════════════════════════════════════════════
