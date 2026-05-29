-- =============================================================================
-- PhotoFrameIn / ChitraFrame — Master Database Schema
-- Project: lxcustacsvamlrtiqkvi.supabase.co
-- Generated: 2026-05-29
--
-- This is the SINGLE SOURCE OF TRUTH for the entire database.
-- Previous migrations (0002_custom_frame_schema.sql, 0003_security_and_perf.sql)
-- are superseded by this file.
--
-- HOW TO USE:
--   • Fresh setup:  Run this entire file in Supabase SQL Editor
--   • Incremental:  All statements use IF NOT EXISTS / OR REPLACE — safe to re-run
--   • Live fixes:   The ALTER TABLE statements at the bottom add missing columns
--
-- SECTIONS:
--   1.  Extensions
--   2.  Core Commerce Tables (products, variants, images, categories)
--   3.  Orders & Customers
--   4.  Coupons & Promotions
--   5.  Content (blog, pages, FAQ)
--   6.  Analytics & Tracking
--   7.  Admin & Security
--   8.  System Configuration
--   9.  Custom Framing
--  10.  Indexes
--  11.  Row Level Security Policies
--  12.  Stored Procedures / RPC Functions
--  13.  Seed: system_config defaults
--  14.  Live Schema Patches (ALTER TABLE for missing columns)
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for ILIKE search optimisation


-- =============================================================================
-- 2. CORE COMMERCE: CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  image_url        TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  hover_color      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_intent_collection BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2b. CORE COMMERCE: PRODUCTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  slug                    TEXT UNIQUE NOT NULL,
  description             TEXT,
  care_details            TEXT,
  size_guide              TEXT,
  category_id             UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  tags                    TEXT[] DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  is_placeholder          BOOLEAN NOT NULL DEFAULT false,
  is_custom_frame         BOOLEAN NOT NULL DEFAULT false,
  is_hidden               BOOLEAN NOT NULL DEFAULT false,
  allowed_frames          TEXT,      -- comma-separated: 'Standard,Premium'
  allowed_sizes           TEXT,      -- comma-separated: 'Small,Medium,Large,XL'
  seo_title               TEXT,
  seo_description         TEXT,
  og_image_url            TEXT,
  frequently_bought_together UUID[] DEFAULT '{}',
  you_may_also_like       UUID[] DEFAULT '{}',
  total_views             INTEGER NOT NULL DEFAULT 0,
  total_orders            INTEGER NOT NULL DEFAULT 0,
  total_revenue           NUMERIC(10,2) NOT NULL DEFAULT 0,
  average_rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count            INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2c. PRODUCT VARIANTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size              TEXT NOT NULL,         -- 'Small' | 'Medium' | 'Large' | 'XL'
  frame_type        TEXT NOT NULL,         -- 'Standard' | 'Premium'
  price             INTEGER NOT NULL,      -- in Rs. (no paise)
  compare_at_price  INTEGER,
  sku               TEXT,
  stock_count       INTEGER NOT NULL DEFAULT -1,  -- -1 = unlimited
  is_active         BOOLEAN NOT NULL DEFAULT true,
  -- Shiprocket shipping dimensions (cm / grams)
  box_length        NUMERIC(6,2),
  box_breadth       NUMERIC(6,2),
  box_height        NUMERIC(6,2),
  volumetric_weight NUMERIC(8,3),
  actual_weight     NUMERIC(8,3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2d. PRODUCT IMAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  alt_text      TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3a. CUSTOMERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      UUID,   -- Supabase Auth user ID (nullable for guest checkout)
  email        TEXT,
  name         TEXT,
  phone        TEXT,
  is_blocked   BOOLEAN NOT NULL DEFAULT false,
  cod_blocked  BOOLEAN NOT NULL DEFAULT false,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spend  INT4 NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Home',
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3b. ORDERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               TEXT UNIQUE NOT NULL,   -- e.g. 'PFI260530001'
  customer_id            UUID REFERENCES public.customers(id),
  customer_name          TEXT NOT NULL,
  customer_phone         TEXT NOT NULL,
  customer_email         TEXT,
  address                JSONB NOT NULL,          -- { line1, line2, city, state, pincode }
  items                  JSONB NOT NULL,          -- array of line items
  subtotal               INTEGER NOT NULL DEFAULT 0,
  shipping_charge        INTEGER NOT NULL DEFAULT 0,
  cod_fee                INTEGER NOT NULL DEFAULT 0,
  discount               INTEGER NOT NULL DEFAULT 0,
  coupon_code            TEXT,
  total                  INTEGER NOT NULL DEFAULT 0,
  payment_method         TEXT NOT NULL DEFAULT 'prepaid', -- 'prepaid' | 'cod'
  payment_id             TEXT,
  razorpay_order_id      TEXT,
  razorpay_signature     TEXT,
  checkout_source        TEXT DEFAULT 'website',
  -- Shiprocket
  shiprocket_synced      BOOLEAN NOT NULL DEFAULT false,
  shiprocket_order_id    TEXT,
  shiprocket_label_url   TEXT,    -- PDF label URL from Shiprocket
  awb_number             TEXT,
  carrier                TEXT,
  carrier_tracking_url   TEXT,
  volumetric_weight      TEXT,
  -- UTM Attribution
  utm_source             TEXT,
  utm_medium             TEXT,
  utm_campaign           TEXT,
  -- Status
  status                 TEXT NOT NULL DEFAULT 'pending',
    -- pending | printing | packed | pickup_scheduled | shipped
    -- delivered | cod_pending | cancelled | damage_replaced
  print_status           TEXT DEFAULT 'queued',
  pickup_status          TEXT,
  cod_confirmed          BOOLEAN NOT NULL DEFAULT false,
  is_replacement         BOOLEAN NOT NULL DEFAULT false,
  linked_order_id        TEXT,
  admin_notes            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3c. DAMAGE CLAIMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.damage_claims (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             TEXT NOT NULL REFERENCES public.orders(order_id),
  video_url            TEXT,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'pending', -- pending | approved | declined
  replacement_order_id TEXT,
  admin_notes          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. COUPONS & PROMOTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT UNIQUE NOT NULL,
  type                 TEXT NOT NULL DEFAULT 'flat',   -- 'flat' | 'percentage'
  value                NUMERIC(10,2) NOT NULL,
  min_subtotal         INTEGER NOT NULL DEFAULT 0,
  max_discount         INTEGER,
  expiry_date          TIMESTAMPTZ,
  total_limit          INTEGER,
  per_user_limit       INTEGER,
  usage_count          INTEGER NOT NULL DEFAULT 0,
  category_restrict    TEXT[],      -- restrict to category slugs
  product_exclude      UUID[],      -- exclude specific product IDs
  combo_exclude        BOOL NOT NULL DEFAULT false,  -- exclude combos from discount
  auto_apply_condition TEXT,        -- JSON condition for auto-apply
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  order_id    TEXT REFERENCES public.orders(order_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.combos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  image_url      TEXT,
  items          JSONB NOT NULL DEFAULT '[]',  -- array of { product_id, variant_id, qty }
  original_price INTEGER NOT NULL DEFAULT 0,
  combo_price    INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. CONTENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  content          TEXT,
  excerpt          TEXT,
  featured_image   TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  category         TEXT,
  tags             TEXT[] DEFAULT '{}',
  is_published     BOOLEAN NOT NULL DEFAULT false,
  product_links    UUID[] DEFAULT '{}',
  author           TEXT DEFAULT 'PhotoFrameIn Team',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  content          TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_versions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id   UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  content   TEXT,
  version   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  image_urls    TEXT[] DEFAULT '{}',
  video_url     TEXT,
  is_approved   BOOLEAN NOT NULL DEFAULT false,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  is_hidden     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT,
  phone      TEXT,
  name       TEXT,
  source     TEXT DEFAULT 'website',
  opted_in   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

-- =============================================================================
-- 6. ANALYTICS & TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sales_funnel_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,   -- view | add_to_cart | initiate_checkout | purchase
  product_id   UUID REFERENCES public.products(id),
  order_id     TEXT,
  session_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  product_id   UUID REFERENCES public.products(id),
  customer_id  UUID REFERENCES public.customers(id),
  session_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_performance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  platform    TEXT NOT NULL,  -- 'meta' | 'google' | 'other'
  campaign    TEXT,
  category    TEXT,
  ad_spend    NUMERIC(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  orders      INTEGER DEFAULT 0,
  revenue     NUMERIC(10,2) DEFAULT 0,
  cac         NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- View stats (lightweight page view counter)
CREATE TABLE IF NOT EXISTS public.view_stats (
  path          TEXT PRIMARY KEY,
  count         INTEGER NOT NULL DEFAULT 1,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pincode RTO risk (for COD blocking)
CREATE TABLE IF NOT EXISTS public.pincode_risk (
  pincode_prefix TEXT PRIMARY KEY,
  total_orders   INTEGER NOT NULL DEFAULT 0,
  rto_count      INTEGER NOT NULL DEFAULT 0,
  cod_blocked    BOOLEAN NOT NULL DEFAULT false,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 7. ADMIN & SECURITY
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'admin',  -- 'admin' | 'superadmin' | 'support'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brute-force rate limiting for admin login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           BIGSERIAL PRIMARY KEY,
  ip_address   TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application error log
CREATE TABLE IF NOT EXISTS public.error_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      TEXT,
  method        TEXT,
  error_message TEXT,
  stack_trace   TEXT,
  ref_id        TEXT UNIQUE,
  request_body  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email delivery log
CREATE TABLE IF NOT EXISTS public.email_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  TEXT,
  recipient TEXT,
  type      TEXT,
  subject   TEXT,
  service   TEXT,   -- 'brevo' | 'resend'
  status    TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email failure queue (for retry)
CREATE TABLE IF NOT EXISTS public.email_failures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT,
  recipient   TEXT,
  type        TEXT,
  subject     TEXT,
  body        TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. SYSTEM CONFIGURATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 9. CUSTOM FRAMING
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.custom_framing_orders_intake (
  order_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
  buyer_fullname             TEXT NOT NULL,
  buyer_whatsapp_phone       TEXT NOT NULL,
  uploaded_image_storage_path TEXT NOT NULL DEFAULT 'no-upload',
  selected_dimension_profile TEXT NOT NULL
    CHECK (selected_dimension_profile IN ('Small','Medium','Large','XL')),
  selected_framing_style     TEXT NOT NULL
    CHECK (selected_framing_style IN ('Direct','Mount')),
  include_poster_print_copy  BOOLEAN NOT NULL DEFAULT false,
  user_special_instructions  TEXT,
  computed_subtotal_amount   NUMERIC(10,2) NOT NULL,
  compliance_notice_version  TEXT DEFAULT 'Implicit Upload Authorization v1',
  processing_status          TEXT NOT NULL DEFAULT 'new'
    CHECK (processing_status IN ('new','in_review','in_production','shipped','completed','cancelled')),
  admin_notes                TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legacy pricing config table from 0002 migration
CREATE TABLE IF NOT EXISTS public.site_settings_config (
  setting_key         TEXT PRIMARY KEY,
  numeric_amount      NUMERIC NOT NULL,
  description_notes   TEXT,
  last_modified_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 10. ATOMIC ORDER SEQUENCE (prevents race conditions on order IDs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_sequence (
  date_key      TEXT PRIMARY KEY,   -- format: YYMMDD e.g. '260530'
  last_sequence INTEGER NOT NULL DEFAULT 0
);

-- =============================================================================
-- 11. INDEXES
-- =============================================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_slug         ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active     ON public.products (is_active) WHERE is_active = true;

-- Variants
CREATE INDEX IF NOT EXISTS idx_variants_product_id   ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_variants_active        ON public.product_variants (product_id, is_active) WHERE is_active = true;

-- Product images
CREATE INDEX IF NOT EXISTS idx_images_product_order  ON public.product_images (product_id, display_order);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_order_id       ON public.orders (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id    ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone          ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_shiprocket     ON public.orders (shiprocket_synced) WHERE shiprocket_synced = false;

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email       ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON public.customers (phone);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id   ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved      ON public.reviews (is_approved) WHERE is_approved = true;

-- Sales funnel
CREATE INDEX IF NOT EXISTS idx_funnel_event_type    ON public.sales_funnel_events (event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_created_at    ON public.sales_funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_product_id    ON public.sales_funnel_events (product_id);

-- Email log
CREATE INDEX IF NOT EXISTS idx_email_log_order_id   ON public.email_log (order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_service     ON public.email_log (service, created_at DESC);

-- Error log
CREATE INDEX IF NOT EXISTS idx_error_log_ref_id     ON public.error_log (ref_id);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON public.error_log (created_at DESC);

-- Login attempts (rate limiting)
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC);

-- Custom framing
CREATE INDEX IF NOT EXISTS idx_cfo_intake_timestamp ON public.custom_framing_orders_intake (intake_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cfo_status           ON public.custom_framing_orders_intake (processing_status);

-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_slug            ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_published       ON public.blog_posts (is_published, created_at DESC) WHERE is_published = true;

-- =============================================================================
-- 12. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.categories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_claims                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_funnel_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_performance               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_stats                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_risk                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_log                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_failures               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sequence               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_framing_orders_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings_config         ENABLE ROW LEVEL SECURITY;

-- ── Service role has full access to everything ────────────────────────────────
-- (All API calls use service_role key, so this covers all backend operations)

DO $$ 
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "service_role_all_%s" ON public.%I
      FOR ALL USING (auth.role() = ''service_role'')
      WITH CHECK (auth.role() = ''service_role'');
    ', tbl, tbl);
  END LOOP;
END $$;

-- ── Public READ access (anon can read catalogue + config) ─────────────────────
CREATE POLICY IF NOT EXISTS "anon_read_products"
  ON public.products FOR SELECT USING (is_active = true AND is_hidden = false);

CREATE POLICY IF NOT EXISTS "anon_read_categories"
  ON public.categories FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "anon_read_variants"
  ON public.product_variants FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "anon_read_images"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_blog"
  ON public.blog_posts FOR SELECT USING (is_published = true);

CREATE POLICY IF NOT EXISTS "anon_read_faq"
  ON public.faq FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "anon_read_reviews"
  ON public.reviews FOR SELECT USING (is_approved = true AND is_hidden = false);

CREATE POLICY IF NOT EXISTS "anon_read_config"
  ON public.system_config FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "anon_read_combos"
  ON public.combos FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "anon_read_coupons"
  ON public.coupons FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "anon_read_site_settings"
  ON public.site_settings_config FOR SELECT USING (true);

-- ── Anon can INSERT (for checkout, leads, reviews) ───────────────────────────
CREATE POLICY IF NOT EXISTS "anon_insert_leads"
  ON public.leads FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_insert_reviews"
  ON public.reviews FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_insert_funnel_events"
  ON public.sales_funnel_events FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_insert_view_stats"
  ON public.view_stats FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_upsert_view_stats"
  ON public.view_stats FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "anon_insert_custom_framing"
  ON public.custom_framing_orders_intake FOR INSERT WITH CHECK (true);


-- =============================================================================
-- 13. STORED PROCEDURES / RPC FUNCTIONS
-- =============================================================================

-- Atomic order sequence increment (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_order_sequence(p_date_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO public.order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_sequence = order_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  RETURN v_seq;
END;
$$;

-- Atomic customer stats increment (prevents read-modify-write race)
CREATE OR REPLACE FUNCTION public.increment_customer_stats(
  p_customer_id UUID,
  p_order_total NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customers
  SET
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spend  = COALESCE(total_spend, 0) + p_order_total,
    updated_at   = now()
  WHERE id = p_customer_id;
END;
$$;

-- Auto-cleanup old login attempts (call via pg_cron or periodic task)
CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - INTERVAL '1 hour';
END;
$$;

-- Upsert view_stats (atomic page view counter)
CREATE OR REPLACE FUNCTION public.upsert_view_stat(p_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.view_stats (path, count, last_viewed_at)
  VALUES (p_path, 1, now())
  ON CONFLICT (path) DO UPDATE
    SET count = view_stats.count + 1,
        last_viewed_at = now();
END;
$$;


-- =============================================================================
-- 14. SEED: SYSTEM CONFIG DEFAULTS
-- =============================================================================
INSERT INTO public.system_config (key, value, description) VALUES
  ('free_shipping_threshold',  '899',                  'Min order total (Rs) for free shipping on prepaid'),
  ('cod_enabled',              'true',                 'Whether Cash on Delivery is available'),
  ('cod_fee',                  '49',                   'Extra fee charged for COD orders'),
  ('prepaid_discount',         '50',                   'Discount given on prepaid orders (Rs)'),
  ('announcement_active',      'true',                 'Show announcement bar on storefront'),
  ('announcement_text',        '🚀 Free Shipping on Prepaid Orders above ₹899 · COD Available across India', 'Announcement bar text'),
  ('announcement_bg',          '#1a1a2e',              'Announcement bar background color'),
  ('razorpay_enabled',         'true',                 'Enable Razorpay payment gateway'),
  ('site_name',                'PhotoFrameIn',         'Site display name'),
  ('site_tagline',             'Premium Framed Wall Art, Delivered to Your Door', 'Site tagline'),
  ('owner_whatsapp',           '919999999999',         'Owner WhatsApp number for alerts'),
  ('poster_addon_price',       '199',                  'Price for extra rolled poster add-on'),
  ('review_photo_enabled',     'true',                 'Allow customers to upload review photos')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 15. LIVE SCHEMA PATCHES
-- (Safe to run on existing DB — ADD COLUMN IF NOT EXISTS is idempotent)
-- =============================================================================

-- admin_users: add role column (missing from original schema)
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

-- orders: add shiprocket_label_url (missing from original schema)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shiprocket_label_url TEXT;

-- Ensure the owner email has a superadmin record
INSERT INTO public.admin_users (email, role)
VALUES ('theframehouse.order@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE SET role = 'superadmin';


-- =============================================================================
-- TABLE COMMENTS
-- =============================================================================
COMMENT ON TABLE public.products               IS 'Product catalogue with SEO, analytics, and customization metadata.';
COMMENT ON TABLE public.product_variants       IS 'Size × Frame combinations with pricing and shipping dimensions.';
COMMENT ON TABLE public.product_images         IS 'Cloudinary CDN image URLs per product, ordered by display_order.';
COMMENT ON TABLE public.orders                 IS 'Customer orders with full address, items, payment and logistics data.';
COMMENT ON TABLE public.customers              IS 'Customer profiles. Linked to Supabase Auth or created as guests.';
COMMENT ON TABLE public.coupons                IS 'Discount coupons with flat/% types, usage limits and validity.';
COMMENT ON TABLE public.system_config          IS 'Key-value config store for runtime settings (shipping, flags, copy).';
COMMENT ON TABLE public.error_log              IS 'Application error log written by logError() in lib/supabase.ts.';
COMMENT ON TABLE public.login_attempts         IS 'Admin login attempts for persistent cross-isolate rate limiting.';
COMMENT ON TABLE public.order_sequence         IS 'Per-day atomic counters for generating sequential order IDs.';
COMMENT ON TABLE public.sales_funnel_events    IS 'Analytics events: view → cart → checkout → purchase funnel.';
COMMENT ON TABLE public.damage_claims          IS 'Customer damage/defect claims with replacement order linkage.';
COMMENT ON TABLE public.custom_framing_orders_intake IS 'Custom photo framing orders from the /customize wizard.';
