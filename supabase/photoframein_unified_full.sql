-- ==========================================
-- FULL UNIFIED SUPABASE SQL SCRIPT
-- ==========================================

-- ==========================================
-- INCLUDED FILE: schema.sql
-- ==========================================
-- PhotoFrameIn - Complete Supabase Schema
-- Version: 1.0 | Production-Ready

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SYSTEM CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  hover_color TEXT DEFAULT '#7C3AED',
  is_active BOOLEAN DEFAULT TRUE,
  is_intent_collection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  care_details TEXT,
  size_guide TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_placeholder BOOLEAN DEFAULT FALSE,
  is_custom_frame BOOLEAN DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  frequently_bought_together UUID[] DEFAULT '{}',
  you_may_also_like UUID[] DEFAULT '{}',
  total_views INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  average_rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCT IMAGES
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCT VARIANTS
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('A4', 'Small', 'Medium', 'Large', 'XL')),
  frame_type TEXT NOT NULL CHECK (frame_type IN ('No Frame', 'Standard', 'Premium')),
  price INTEGER NOT NULL,
  compare_at_price INTEGER,
  sku TEXT UNIQUE,
  stock_count INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  box_length NUMERIC(5,1),
  box_breadth NUMERIC(5,1),
  box_height NUMERIC(5,1),
  volumetric_weight NUMERIC(5,2),
  actual_weight NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  cod_blocked BOOLEAN DEFAULT FALSE,
  total_orders INTEGER DEFAULT 0,
  total_spend INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMER ADDRESSES
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WISHLISTS
-- ============================================
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ============================================
-- ORDER SEQUENCE (for PS-YYMMDD-XXXX format)
-- ============================================
CREATE TABLE IF NOT EXISTS order_sequence (
  date_key TEXT PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  shipping_charge INTEGER DEFAULT 0,
  cod_fee INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  coupon_code TEXT,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('prepaid', 'cod')),
  payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  checkout_source TEXT DEFAULT 'shiprocket' CHECK (checkout_source IN ('shiprocket', 'custom')),
  shiprocket_synced BOOLEAN DEFAULT FALSE,
  shiprocket_order_id TEXT,
  awb_number TEXT,
  carrier TEXT,
  carrier_tracking_url TEXT,
  volumetric_weight TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'cod_pending', 'printing', 'packed',
    'pickup_scheduled', 'shipped', 'delivered',
    'cancelled', 'rto', 'damage_replaced'
  )),
  print_status TEXT DEFAULT 'pending' CHECK (print_status IN ('pending', 'in_progress', 'done')),
  pickup_status TEXT DEFAULT 'not_scheduled' CHECK (pickup_status IN ('not_scheduled', 'scheduled', 'picked_up')),
  cod_confirmed BOOLEAN DEFAULT FALSE,
  is_replacement BOOLEAN DEFAULT FALSE,
  linked_order_id TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAMAGE CLAIMS
-- ============================================
CREATE TABLE IF NOT EXISTS damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  video_url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  replacement_order_id TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL LOG
-- ============================================
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  service TEXT CHECK (service IN ('brevo', 'resend')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL FAILURES (for retry)
-- ============================================
CREATE TABLE IF NOT EXISTS email_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  recipient TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  name TEXT,
  source TEXT NOT NULL CHECK (source IN ('exit_intent', 'notify_oos', 'newsletter', 'whatsapp_cta')),
  opted_in BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUPONS
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL,
  min_subtotal INTEGER DEFAULT 0,
  max_discount INTEGER,
  expiry_date TIMESTAMPTZ,
  total_limit INTEGER,
  per_user_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  category_restrict UUID[],
  product_exclude UUID[],
  combo_exclude BOOLEAN DEFAULT FALSE,
  auto_apply_condition TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUPON USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id),
  customer_id UUID REFERENCES customers(id),
  order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  image_urls TEXT[],
  video_url TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLOG POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  category TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT FALSE,
  product_links UUID[],
  author TEXT DEFAULT 'PhotoFrameIn',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAGES (policies, about, contact)
-- ============================================
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAGE VERSIONS (history)
-- ============================================
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FAQ
-- ============================================
CREATE TABLE IF NOT EXISTS faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  product_id UUID,
  customer_id UUID,
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ERROR LOG
-- ============================================
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT,
  method TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  ref_id TEXT,
  request_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMBOS / BUNDLES
-- ============================================
CREATE TABLE IF NOT EXISTS combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  items JSONB NOT NULL,
  original_price INTEGER NOT NULL,
  combo_price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PINCODE RISK (RTO Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS pincode_risk (
  pincode_prefix TEXT PRIMARY KEY,
  total_orders INTEGER DEFAULT 0,
  rto_count INTEGER DEFAULT 0,
  cod_blocked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_damage_claims_order ON damage_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_auth ON customers(auth_id);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own profile
CREATE POLICY "customers_own_data" ON customers
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (auth.uid() = auth_id);

-- Customers can only see their own addresses
CREATE POLICY "addresses_own_data" ON customer_addresses
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Customers can only see their own orders
CREATE POLICY "orders_own_data" ON orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Customers can only see their own wishlist
CREATE POLICY "wishlists_own_data" ON wishlists
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Public read access for products, categories, reviews, blog, pages, faq
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (TRUE);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_public_read" ON product_variants FOR SELECT USING (TRUE);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_public_read" ON product_images FOR SELECT USING (TRUE);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (TRUE);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (is_approved = TRUE);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_public_read" ON blog_posts FOR SELECT USING (is_published = TRUE);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_public_read" ON pages FOR SELECT USING (TRUE);

ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_public_read" ON faq FOR SELECT USING (is_active = TRUE);

ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combos_public_read" ON combos FOR SELECT USING (is_active = TRUE);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Atomic order sequence increment
CREATE OR REPLACE FUNCTION increment_order_sequence(p_date_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_seq INTEGER;
BEGIN
  INSERT INTO order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE SET last_sequence = order_sequence.last_sequence + 1
  RETURNING last_sequence INTO new_seq;
  RETURN new_seq;
END;
$$ LANGUAGE plpgsql;

-- Increment customer stats on order creation
CREATE OR REPLACE FUNCTION increment_customer_stats(p_customer_id UUID, p_order_total INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    total_orders = total_orders + 1,
    total_spend = total_spend + p_order_total,
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INCLUDED FILE: admin_auth.sql
-- ==========================================
-- PhotoFrameIn - Admin Users & Role Check
-- Implementation of Supabase Auth based admin login

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Enable RLS (Security)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can read the table, but only superadmins can modify it
CREATE POLICY "admins_read_admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Seed initial admin (using owner_email from system_config as fallback or common practice)
-- NOTE: The actual auth user must be created via Supabase Auth Dashboard or API
INSERT INTO admin_users (email, role)
SELECT value, 'superadmin' 
FROM system_config 
WHERE key = 'owner_email' AND value <> ''
ON CONFLICT (email) DO NOTHING;

-- If system_config owner_email is empty, we'll manually add a placeholder that the owner can replace
INSERT INTO admin_users (email, role)
VALUES ('admin@photoframein.com', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- INCLUDED FILE: add_is_hidden.sql
-- ==========================================
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

-- ==========================================
-- INCLUDED FILE: update_images.sql
-- ==========================================
-- SQL Script to update product and category images with locally generated assets

-- 1. Updates specifically for Divine category
UPDATE product_images 
SET image_url = '/images/products/shree_ganesh_aura.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Shree Ganesh%' OR name ILIKE '%Ganesha%');

UPDATE product_images 
SET image_url = '/images/products/om_namah_shivaya_cosmic.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Om Namah Shivaya%' OR name ILIKE '%Shiva%');

UPDATE product_images 
SET image_url = '/images/products/krishna_flute_melody.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Krishna%');

-- 2. Updates specifically for Automotive category
UPDATE product_images 
SET image_url = '/images/products/midnight_lambo_neon.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Lambo%' OR name ILIKE '%Lamborghini%');

UPDATE product_images 
SET image_url = '/images/products/gtr_skyline_rain.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%GT-R%' OR name ILIKE '%Skyline%');

UPDATE product_images 
SET image_url = '/images/products/porsche_911_sunset.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Porsche%');

-- 3. Category Cover Images
UPDATE categories 
SET image_url = '/images/products/shree_ganesh_aura.png' 
WHERE name = 'Divine';

UPDATE categories 
SET image_url = '/images/products/porsche_911_sunset.png' 
WHERE name = 'Automotive';

-- ==========================================
-- INCLUDED FILE: apply_updates.sql
-- ==========================================
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

-- ==========================================
-- INCLUDED FILE: seed.sql
-- ==========================================
-- PhotoFrameIn - Seed Data
-- Sample products, categories, system defaults

-- ============================================
-- SYSTEM CONFIG DEFAULTS
-- ============================================
INSERT INTO system_config (key, value, description) VALUES
  ('checkout_mode', 'shiprocket', 'Primary checkout: shiprocket or custom'),
  ('cod_enabled', 'true', 'Global COD toggle'),
  ('cod_min_value', '499', 'Minimum order for COD'),
  ('cod_max_value', '1995', 'Maximum order for COD'),
  ('cod_fee', '49', 'COD fee charged to customer'),
  ('free_shipping_threshold', '799', 'Free shipping above this amount (prepaid)'),
  ('pickup_pincode', '501504', 'Warehouse pickup pincode'),
  ('acrylic_enabled', 'true', 'Acrylic upgrade toggle'),
  ('combos_enabled', 'true', 'Global combos toggle'),
  ('a4_oos_threshold', '10', 'Auto OOS if A4 exceeds % of daily orders'),
  ('exit_intent_enabled', 'true', 'Exit intent popup toggle'),
  ('festival_mode', '', 'Active festival: diwali, navratri, etc.'),
  ('announcement_text', 'Free Delivery on orders above Rs.799 | COD Available', 'Top bar text'),
  ('announcement_link', '/shop', 'Top bar link'),
  ('announcement_bg', '#CC0000', 'Top bar background color'),
  ('announcement_active', 'true', 'Show announcement bar'),
  ('urgency_text', 'Limited Stock Available', 'Urgency message on product pages'),
  ('urgency_subtext', 'Offer Ends Tonight', 'Urgency sub message'),
  ('whatsapp_number', '91XXXXXXXXXX', 'WhatsApp for COD confirmation'),
  ('whatsapp_prepaid_message', 'Hi! I just placed an order on PhotoFrameIn. Order ID: {order_id}', 'Prepaid WhatsApp template'),
  ('whatsapp_cod_message', 'Hi! I placed a COD order on PhotoFrameIn. Order ID: {order_id}. Please confirm my order.', 'COD WhatsApp template'),
  ('owner_email', '', 'Owner email for notifications'),
  ('prepaid_discount', '50', 'Prepaid discount amount'),
  ('hero_banner_title', 'Premium Wall Art & Poster Frames', 'Homepage hero title'),
  ('hero_banner_subtitle', 'Transform Your Space Into an Aesthetic Setup', 'Homepage hero subtitle'),
  ('hero_banner_image', '', 'Homepage hero background image'),
  ('hero_banner_cta_text', 'Shop Now', 'Homepage hero CTA text'),
  ('hero_banner_cta_link', '/shop', 'Homepage hero CTA link'),
  ('instagram_link', '', 'Instagram profile link'),
  ('facebook_link', '', 'Facebook page link'),
  ('twitter_link', '', 'Twitter profile link'),
  ('about_content', 'PhotoFrameIn is your destination for premium wall art and photo frames. We craft beautiful frames with the fastest turnaround in India.', 'About us text'),
  ('contact_email', 'support@photoframein.com', 'Customer support email'),
  ('contact_phone', '', 'Customer support phone'),
  ('contact_address', 'Hyderabad, Telangana, India', 'Store address'),
  ('maps_embed', '', 'Google Maps embed URL'),
  ('seo_title', 'PhotoFrameIn | Premium Wall Art & Photo Frames in India', 'Homepage SEO title'),
  ('seo_description', 'Buy premium poster frames, wall art & custom photo frames online. Fast delivery across India. Starting Rs.199. Free delivery on Rs.799+', 'Homepage SEO desc'),
  ('og_image', '', 'Homepage OG image'),
  ('gtm_container_id', '', 'Google Tag Manager container ID'),
  ('shipping_prepaid_below_floor', '79', 'Shipping floor for prepaid below threshold'),
  ('shipping_a4_floor', '79', 'Shipping floor for A4 orders'),
  ('shipping_cod_small_medium_floor', '99', 'Shipping floor for COD small/medium'),
  ('shipping_cod_large_xl_floor', '149', 'Shipping floor for COD large/XL')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO categories (name, slug, description, hover_color, display_order, is_active) VALUES
  ('Divine', 'divine', 'Sacred art and spiritual wall decor featuring deities, mandalas, and divine energy', '#7C3AED', 1, true),
  ('Automotive', 'automotive', 'Premium automotive art featuring supercars, classic rides, and racing legends', '#E8670A', 2, true),
  ('Motivation', 'motivation', 'Inspiring quotes and motivational artwork to fuel your ambition', '#FFD700', 3, true),
  ('Sports', 'sports', 'Iconic sports moments, athlete art, and stadium photography', '#22C55E', 4, true),
  ('Custom Frames', 'custom-frames', 'Upload your own photo and get it framed with premium quality', '#CC0000', 5, true),
  ('Anime & Pop Culture', 'anime-pop-culture', 'Anime, manga, and pop culture wall art', '#FF69B4', 6, true),
  ('Nature & Landscape', 'nature-landscape', 'Stunning nature photography and landscape wall art', '#10B981', 7, true),
  ('Minimal & Abstract', 'minimal-abstract', 'Clean minimal art and abstract designs for modern spaces', '#6B7280', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- Intent-based collections
INSERT INTO categories (name, slug, description, display_order, is_active, is_intent_collection) VALUES
  ('Gifts Under Rs.999', 'gifts-under-999', 'Perfect gifts that won''t break the bank', 100, true, true),
  ('Bedroom Aesthetic', 'bedroom-aesthetic', 'Curated picks to transform your bedroom', 101, true, true),
  ('Study/Work Setup', 'study-work-setup', 'Motivational art for your workspace', 102, true, true),
  ('Couple/Romantic', 'couple-romantic', 'Romantic wall art for couples', 103, true, true),
  ('Festival Collection', 'festival-collection', 'Seasonal festival specials', 104, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE PRODUCTS (Placeholders)
-- ============================================

-- Divine Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Shree Ganesh Golden Aura', 'shree-ganesh-golden-aura',
   'Bring divine energy into your space with this stunning Lord Ganesh artwork. The golden tones and intricate detailing create a warm, sacred atmosphere perfect for your puja room or living area.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Shree Ganesh Golden Aura Wall Art | PhotoFrameIn',
   'Buy Shree Ganesh golden artwork. Premium framed print with rich golden tones. Perfect for puja room. Free delivery Rs.799+',
   ARRAY['divine', 'ganesh', 'god', 'spiritual', 'puja'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Om Namah Shivaya Cosmic', 'om-namah-shivaya-cosmic',
   'A mesmerizing cosmic representation of Lord Shiva in deep meditation. The vibrant blues and cosmic energy make this a powerful centerpiece for any spiritual space.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Om Namah Shivaya Cosmic Art | PhotoFrameIn',
   'Lord Shiva cosmic meditation art print. Premium framed wall decor. Spiritual energy for your home.',
   ARRAY['divine', 'shiva', 'spiritual', 'cosmic', 'meditation'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Krishna Flute Melody', 'krishna-flute-melody',
   'Lord Krishna playing the divine flute under the moonlit sky. Soft warm tones and ethereal composition that brings peace and devotion to your wall.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Krishna Flute Melody Wall Art | PhotoFrameIn',
   'Lord Krishna flute art print. Premium framed wall decor for home. Free delivery Rs.799+',
   ARRAY['divine', 'krishna', 'spiritual', 'flute', 'devotion'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Automotive Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Midnight Lambo Neon', 'midnight-lambo-neon',
   'A Lamborghini Aventador slicing through neon-lit city streets at midnight. The electric blue and purple reflections make this the ultimate wall art for car enthusiasts.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Midnight Lamborghini Neon Wall Art | PhotoFrameIn',
   'Lamborghini neon city wall art. Premium framed poster for car lovers. Dark aesthetic, vibrant colors.',
   ARRAY['automotive', 'lamborghini', 'neon', 'supercar', 'night'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('GT-R Skyline Rain', 'gtr-skyline-rain',
   'The legendary Nissan GT-R R34 Skyline parked in a rain-soaked Tokyo alley. Moody cinematic vibes with Japanese neon signs reflecting off wet pavement.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Nissan GT-R Skyline Rain Wall Art | PhotoFrameIn',
   'Nissan GT-R R34 Skyline rain art. Tokyo JDM aesthetic. Premium framed wall poster.',
   ARRAY['automotive', 'gtr', 'skyline', 'jdm', 'tokyo', 'rain'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Porsche 911 Sunset Drive', 'porsche-911-sunset-drive',
   'A classic Porsche 911 cruising along a coastal highway at golden hour. Warm sunset tones and open road vibes that bring freedom to your wall.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Porsche 911 Sunset Drive Wall Art | PhotoFrameIn',
   'Porsche 911 sunset coastal drive poster. Premium framed print. Perfect for car enthusiasts.',
   ARRAY['automotive', 'porsche', '911', 'sunset', 'coastal'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Motivation Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Grind in Silence', 'grind-in-silence',
   'Bold typography on dark background — "GRIND IN SILENCE. LET SUCCESS MAKE THE NOISE." A powerful daily reminder for your workspace.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Grind in Silence Motivational Poster | PhotoFrameIn',
   'Grind in Silence motivational wall art. Bold typography poster for workspace. Premium framed print.',
   ARRAY['motivation', 'quotes', 'hustle', 'success', 'workspace'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Discipline Equals Freedom', 'discipline-equals-freedom',
   'Minimalist monochrome design with the words "DISCIPLINE = FREEDOM" — clean, powerful, and made for the focused mind.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Discipline Equals Freedom Poster | PhotoFrameIn',
   'Discipline Equals Freedom minimal poster. Monochrome motivational wall art for study room.',
   ARRAY['motivation', 'discipline', 'freedom', 'minimal', 'workspace'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Rise and Conquer', 'rise-and-conquer',
   'Golden sunrise over mountain peaks with "RISE AND CONQUER" in elegant typography. The perfect blend of nature and motivation.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Rise and Conquer Motivational Art | PhotoFrameIn',
   'Rise and Conquer sunrise mountain poster. Premium motivational framed wall art.',
   ARRAY['motivation', 'sunrise', 'mountain', 'conquer', 'nature'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Sports Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Cricket Stadium Lights', 'cricket-stadium-lights',
   'The electric atmosphere of a night cricket match under stadium floodlights. Feel the roar of the crowd every time you look at your wall.',
   (SELECT id FROM categories WHERE slug = 'sports'), true,
   'Cricket Stadium Lights Wall Art | PhotoFrameIn',
   'Cricket night match stadium poster. Premium framed sports wall art. Perfect for cricket fans.',
   ARRAY['sports', 'cricket', 'stadium', 'night', 'india'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Football Glory Moment', 'football-glory-moment',
   'The split-second before a winning goal — frozen in time. Dynamic composition capturing the raw emotion and power of the beautiful game.',
   (SELECT id FROM categories WHERE slug = 'sports'), true,
   'Football Glory Moment Wall Art | PhotoFrameIn',
   'Football goal celebration poster. Premium framed sports wall art for football fans.',
   ARRAY['sports', 'football', 'goal', 'celebration'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PRODUCT VARIANTS (for all products)
-- ============================================

-- Function to create variants for a product
-- We'll insert them manually for each product

-- Helper: Insert variants for each product
DO $$
DECLARE
  prod RECORD;
BEGIN
  FOR prod IN SELECT id, slug, is_custom_frame FROM products LOOP
    -- A4 Print (hidden loss leader)
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES (prod.id, 'A4', 'No Frame', 99, 199, prod.slug || '-a4-noframe', 35, 25, 0.5, 0.1, 0.1)
    ON CONFLICT (sku) DO NOTHING;

    -- Small variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Small', 'No Frame', 199, 349, prod.slug || '-sm-noframe', 38, 30, 5, 1.14, 0.3),
    (prod.id, 'Small', 'Standard', 449, 699, prod.slug || '-sm-standard', 38, 30, 5, 1.14, 0.8),
    (prod.id, 'Small', 'Premium', 599, 899, prod.slug || '-sm-premium', 38, 30, 5, 1.14, 1.0)
    ON CONFLICT (sku) DO NOTHING;

    -- Medium variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Medium', 'No Frame', 299, 499, prod.slug || '-md-noframe', 50, 38, 7, 2.66, 0.5),
    (prod.id, 'Medium', 'Standard', 749, 1299, prod.slug || '-md-standard', 50, 38, 7, 2.66, 1.5),
    (prod.id, 'Medium', 'Premium', 999, 1499, prod.slug || '-md-premium', 50, 38, 7, 2.66, 2.0)
    ON CONFLICT (sku) DO NOTHING;

    -- Large variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Large', 'No Frame', 399, 699, prod.slug || '-lg-noframe', 55, 42, 8, 3.70, 0.8),
    (prod.id, 'Large', 'Standard', 1099, 1599, prod.slug || '-lg-standard', 55, 42, 8, 3.70, 2.5),
    (prod.id, 'Large', 'Premium', 1399, 1999, prod.slug || '-lg-premium', 55, 42, 8, 3.70, 3.0)
    ON CONFLICT (sku) DO NOTHING;

    -- XL variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'XL', 'No Frame', 499, 899, prod.slug || '-xl-noframe', 80, 55, 10, 8.80, 1.2),
    (prod.id, 'XL', 'Standard', 1699, 2499, prod.slug || '-xl-standard', 80, 55, 10, 8.80, 4.0),
    (prod.id, 'XL', 'Premium', 2199, 2999, prod.slug || '-xl-premium', 80, 55, 10, 8.80, 5.0)
    ON CONFLICT (sku) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- SAMPLE COMBOS / BUNDLES
-- ============================================
INSERT INTO combos (name, slug, description, items, original_price, combo_price, is_active) VALUES
  ('Starter Desk Setup', 'starter-desk-setup', '3 A4 prints in the same theme — perfect for your desk or bedside', '{"count": 3, "size": "A4", "frame": "No Frame"}', 297, 249, true),
  ('Bedroom Aesthetic Kit', 'bedroom-aesthetic-kit', '5 Small framed prints curated for the same room vibe', '{"count": 5, "size": "Small", "frame": "Standard"}', 2245, 599, true),
  ('Full Wall Transformation Pack', 'full-wall-transformation', '10 unframed prints — create a gallery wall composition', '{"count": 10, "size": "Medium", "frame": "No Frame"}', 2990, 999, true),
  ('Premium Gift Frame', 'premium-gift-frame', '1 Medium Premium frame + gift wrap + card — perfect present', '{"count": 1, "size": "Medium", "frame": "Premium", "extras": ["gift_wrap", "card"]}', 1499, 1199, true),
  ('Midnight Drive Set', 'midnight-drive-set', '5 automotive dark prints with neon accents', '{"count": 5, "size": "Small", "frame": "Standard", "category": "automotive"}', 2245, 699, true),
  ('Divine Energy Pack', 'divine-energy-pack', '5 divine prints in warm gold/saffron palette', '{"count": 5, "size": "Small", "frame": "Standard", "category": "divine"}', 2245, 799, true),
  ('Focus Mode Setup', 'focus-mode-setup', '5 motivation prints in minimal monochrome', '{"count": 5, "size": "Small", "frame": "Standard", "category": "motivation"}', 2245, 599, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE FAQ
-- ============================================
INSERT INTO faq (question, answer, display_order) VALUES
  ('Will it break during delivery?', 'No. We use 5-layer packaging with corner protectors. If it arrives damaged, film your unboxing and we replace it free — no questions asked.', 1),
  ('How long does delivery take?', '3-5 business days across India. 1-3 days in Hyderabad (500xxx pincodes).', 2),
  ('Is COD available?', 'Yes, for orders above Rs.499. A Rs.49 confirmation fee applies. WhatsApp confirmation required within 24 hours.', 3),
  ('What is your return policy?', 'Damaged items are replaced free — unboxing video required. Custom frames are non-returnable. Full policy on our Returns page.', 4),
  ('What if I want to cancel?', 'Cancellations are accepted within 24 hours if the order is not yet dispatched. After dispatch, cancellations are not possible.', 5),
  ('Do you offer custom frames?', 'Yes! Upload your own photo and we will frame it for you. Custom frames are prepaid only and non-returnable. Minimum resolution: 1500x2000px.', 6),
  ('What payment methods do you accept?', 'We accept all UPI apps, credit/debit cards, net banking, and Cash on Delivery (for orders Rs.499-Rs.1,995).', 7),
  ('How do I track my order?', 'Visit our Track page and enter your Order ID (PS-XXXXXX) or registered phone number. You will also receive tracking updates via email.', 8)
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT PAGES
-- ============================================
INSERT INTO pages (slug, title, content) VALUES
  ('returns', 'Returns & Refund Policy', '<h2>Returns & Refund Policy</h2><p>At PhotoFrameIn, we want you to be completely happy with your purchase.</p><h3>Damage Claims</h3><p>If your order arrives damaged, we will replace it free of charge. <strong>An unboxing video is mandatory</strong> for all damage claims. No video = no claim.</p><h3>Custom Frames</h3><p><strong>Custom frame orders are final — no returns or cancellations allowed.</strong></p><h3>Cancellations</h3><p>Orders can be cancelled within 24 hours of placing if not yet dispatched. After dispatch, cancellations are not possible.</p><h3>Refund Timeline</h3><ul><li>Prepaid, not dispatched, within 24h: 5-7 business days via original payment method</li><li>COD, not dispatched, within 24h: 2-3 business days via bank/UPI transfer</li><li>Damaged with video: Free replacement in 3-5 days</li><li>Wrong item: Free replacement + return pickup</li></ul>'),
  ('terms', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>By using PhotoFrameIn, you agree to these terms.</p><h3>Orders</h3><p>All orders are made-to-order. Delivery timeline is 3-5 business days across India.</p><h3>COD Policy</h3><p>COD is available for orders between Rs.499 and Rs.1,995. A non-refundable Rs.49 COD fee applies. Orders must be confirmed via WhatsApp within 24 hours or they will be auto-cancelled.</p><h3>Custom Frames</h3><p>Custom frame orders are prepaid only. No returns, refunds, or cancellations.</p>'),
  ('shipping', 'Shipping Policy', '<h2>Shipping Policy</h2><p>We dispatch orders within 12 hours of confirmation.</p><h3>Delivery Timeline</h3><ul><li>Hyderabad (500xxx): 1-3 business days</li><li>Rest of India: 3-5 business days</li></ul><h3>Shipping Charges</h3><ul><li>Prepaid orders above Rs.799: FREE</li><li>Prepaid orders below Rs.799: Rs.79</li><li>COD Small/Medium: Rs.99</li><li>COD Large/XL: Rs.149</li></ul><h3>Packaging</h3><p>Every frame is packed with 5-layer protection including corner protectors to ensure safe delivery.</p>'),
  ('privacy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>PhotoFrameIn respects your privacy. We collect only essential information to process orders.</p><h3>What We Collect</h3><ul><li>Name, email, phone for order processing</li><li>Address for delivery</li><li>Payment information (processed securely by Razorpay)</li></ul><h3>How We Use It</h3><p>Your information is used solely for order processing, delivery, and customer support. We never sell your data to third parties.</p>')
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- INCLUDED FILE: seed_admin.sql
-- ==========================================
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

-- ==========================================
-- INCLUDED FILE: migration_v2.sql
-- ==========================================
-- migration_v2.sql: Intru Storefront Funnel Optimization
-- Execute this in your Supabase SQL Editor

-- 1. Atomic Traffic Tracker (RPC)
CREATE TABLE IF NOT EXISTS public.view_stats (
    path TEXT PRIMARY KEY,
    count BIGINT DEFAULT 0,
    last_viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_view(target_path TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.view_stats (path, count, last_viewed_at)
    VALUES (target_path, 1, NOW())
    ON CONFLICT (path) DO UPDATE
    SET count = view_stats.count + 1,
        last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Coupons System
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('percent', 'flat')) DEFAULT 'percent',
    value NUMERIC NOT NULL,
    min_total NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expiry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dynamic Ratings & Reviews
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    customer_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Email Log (Quota Management)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    type TEXT NOT NULL, -- 'abandoned_cart', 'order_confirmation', etc.
    order_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enhanced Orders (for History UI)
-- Assuming public.orders already exists, let's ensure it has an index for fast history lookup
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 6. Sales Funnel Events
CREATE TABLE IF NOT EXISTS public.funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT,
    email TEXT,
    event_type TEXT CHECK (event_type IN ('identify', 'add_to_cart', 'checkout_start', 'payment_success', 'view')),
    product_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Coupon usage tracking columns (run if upgrading from v15.2)
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses INTEGER;

-- 8. Users table: track last login
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();

-- Grant RPC access to anon role for view tracking
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO service_role;

-- Row Level Security (ensure tables allow service-key writes)
ALTER TABLE public.view_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policies: allow service_role full access, anon can read coupons/view_stats
CREATE POLICY IF NOT EXISTS "service_role_all_view_stats" ON public.view_stats FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_funnel_events" ON public.funnel_events FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_email_logs" ON public.email_logs FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_coupons" ON public.coupons FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_coupons" ON public.coupons FOR SELECT TO anon USING (is_active = true);
