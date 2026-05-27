-- ═══════════════════════════════════════════════════════════════════════════
-- ChitraFrame — Complete site_config upsert
-- Run this in Supabase → SQL Editor to instantly fix the live site.
-- Safe to run multiple times — uses ON CONFLICT DO UPDATE.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO site_config (key, value) VALUES
  ('brand_name',           'ChitraFrame'),
  ('seo_title',            'ChitraFrame | Real Glass Photo Frames & Wall Art Online India — chitraframe.in'),
  ('seo_description',      'Buy real glass photo frames online in India. Solid wood, museum-grade prints, UV-resistant inks. Free delivery above ₹899. COD available. chitraframe.in'),
  ('announcement_text',    'Real Glass · Real Wood · Free Delivery on orders above ₹899 | COD Available'),
  ('announcement_active',  'true'),
  ('free_shipping_threshold', '899'),
  ('poster_addon_price',   '199'),
  ('contact_email',        'support@chitraframe.in'),
  ('price_small',          '499'),
  ('price_medium',         '799'),
  ('price_large',          '1149'),
  ('price_xl',             '1749'),
  ('price_premium_addon',  '250'),
  ('price_poster',         '199'),
  ('price_acrylic_addon',  '350'),
  ('price_cod_fee',        '49'),
  ('price_prepaid_discount','50'),
  ('price_shipping',       '99'),
  ('price_free_shipping_threshold', '899')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify:
SELECT key, value FROM site_config
WHERE key IN (
  'brand_name', 'seo_title', 'poster_addon_price',
  'free_shipping_threshold', 'contact_email'
)
ORDER BY key;
