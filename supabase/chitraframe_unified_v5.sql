-- ============================================================================
-- ChitraFrame — UNIFIED DATABASE SCRIPT v5.0
-- ============================================================================
-- Brand  : ChitraFrame | chitraframe.in
-- Cloud  : Cloudinary cloud = dax4yqumu
-- Images : https://res.cloudinary.com/dax4yqumu/image/upload/...
-- Generated: 2026-05-27
-- ============================================================================
-- HOW TO USE ON A NEW SUPABASE ACCOUNT:
--   1. Create a new Supabase project
--   2. Go to: Dashboard → SQL Editor → New Query
--   3. Paste this entire file → click Run
--   4. All tables, indexes, RLS, functions, seed data will be created.
--   5. Safe to re-run at any time — all statements are fully idempotent.
-- ============================================================================
-- WHAT THIS SCRIPT CREATES:
--   • All core tables (products, variants, images, orders, customers, etc.)
--   • All analytics & tracking tables
--   • All indexes for performance
--   • RLS policies (public read, owner write)
--   • RPC functions (order sequence, customer stats, view tracking)
--   • System config defaults (ChitraFrame branded)
--   • 6 product categories + intent collections
--   • 51 products (full catalog) with SEO metadata
--   • 408 product variants (51 × 4 sizes × 2 frame types)
--   • 51 product_images linked to Cloudinary CDN URLs
--   • Admin user seed
--   • FAQ (8 questions)
--   • Static pages (returns, terms, shipping, privacy)
--   • 9 SEO blog posts
--   • Combo/bundle deals
-- ============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- ─── SYSTEM CONFIG ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SITE CONFIG (alias — same purpose, some routes use this name) ───────────
CREATE TABLE IF NOT EXISTS site_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  description          TEXT,
  image_url            TEXT,
  display_order        INTEGER DEFAULT 0,
  hover_color          TEXT DEFAULT '#C9973A',
  hero_title           TEXT,
  hero_subtitle        TEXT,
  hero_badge           TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  is_intent_collection BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  description               TEXT,
  short_description         TEXT,
  care_details              TEXT,
  size_guide                TEXT,
  category_id               UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags                      TEXT[] DEFAULT '{}',
  is_active                 BOOLEAN DEFAULT TRUE,
  is_placeholder            BOOLEAN DEFAULT FALSE,
  is_custom_frame           BOOLEAN DEFAULT FALSE,
  is_hidden                 BOOLEAN DEFAULT FALSE,
  is_featured               BOOLEAN DEFAULT FALSE,
  display_order             INTEGER DEFAULT 0,
  seo_title                 TEXT,
  seo_description           TEXT,
  og_image_url              TEXT,
  frequently_bought_together UUID[] DEFAULT '{}',
  you_may_also_like         UUID[] DEFAULT '{}',
  total_views               INTEGER DEFAULT 0,
  total_orders              INTEGER DEFAULT 0,
  total_revenue             INTEGER DEFAULT 0,
  average_rating            NUMERIC(2,1) DEFAULT 0,
  review_count              INTEGER DEFAULT 0,
  allowed_sizes             TEXT DEFAULT NULL,
  allowed_frames            TEXT DEFAULT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN products.allowed_sizes  IS 'CSV of allowed sizes e.g. "Small,Medium,Large,XL". NULL = all sizes shown.';
COMMENT ON COLUMN products.allowed_frames IS 'CSV of allowed frame types e.g. "Standard,Premium". NULL = all shown.';

-- ─── PRODUCT IMAGES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text      TEXT,
  is_primary    BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCT VARIANTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size               TEXT NOT NULL,
  frame_type         TEXT NOT NULL,
  price              INTEGER NOT NULL,
  compare_price      INTEGER,
  compare_at_price   INTEGER,
  sku                TEXT UNIQUE,
  stock_qty          INTEGER DEFAULT 50,
  stock_count        INTEGER DEFAULT 999,
  is_active          BOOLEAN DEFAULT TRUE,
  box_length         NUMERIC(5,1),
  box_breadth        NUMERIC(5,1),
  box_height         NUMERIC(5,1),
  volumetric_weight  NUMERIC(5,2),
  actual_weight      NUMERIC(5,2),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      UUID UNIQUE,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT,
  phone        TEXT,
  is_blocked   BOOLEAN DEFAULT FALSE,
  cod_blocked  BOOLEAN DEFAULT FALSE,
  total_orders INTEGER DEFAULT 0,
  total_spend  INTEGER DEFAULT 0,
  last_login   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CUSTOMER ADDRESSES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Home',
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WISHLISTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ─── ORDER SEQUENCE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_sequence (
  date_key      TEXT PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             TEXT UNIQUE NOT NULL,
  customer_id          UUID REFERENCES customers(id),
  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  customer_email       TEXT NOT NULL,
  address              JSONB NOT NULL,
  items                JSONB NOT NULL,
  subtotal             INTEGER NOT NULL,
  shipping_charge      INTEGER DEFAULT 0,
  cod_fee              INTEGER DEFAULT 0,
  discount             INTEGER DEFAULT 0,
  coupon_code          TEXT,
  total                INTEGER NOT NULL,
  payment_method       TEXT NOT NULL CHECK (payment_method IN ('prepaid', 'cod')),
  payment_id           TEXT,
  razorpay_order_id    TEXT,
  razorpay_signature   TEXT,
  checkout_source      TEXT DEFAULT 'custom' CHECK (checkout_source IN ('shiprocket', 'custom')),
  shiprocket_synced    BOOLEAN DEFAULT FALSE,
  shiprocket_order_id  TEXT,
  shiprocket_label_url TEXT,
  awb_number           TEXT,
  carrier              TEXT,
  carrier_tracking_url TEXT,
  volumetric_weight    TEXT,
  weight               NUMERIC(5,2),
  utm_source           TEXT,
  utm_medium           TEXT,
  utm_campaign         TEXT,
  status               TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'cod_pending', 'printing', 'packed',
    'pickup_scheduled', 'shipped', 'delivered',
    'cancelled', 'rto', 'damage_replaced'
  )),
  print_status         TEXT DEFAULT 'pending' CHECK (print_status IN ('pending', 'in_progress', 'done')),
  pickup_status        TEXT DEFAULT 'not_scheduled' CHECK (pickup_status IN ('not_scheduled', 'scheduled', 'picked_up')),
  cod_confirmed        BOOLEAN DEFAULT FALSE,
  is_replacement       BOOLEAN DEFAULT FALSE,
  linked_order_id      TEXT,
  admin_notes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DAMAGE CLAIMS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS damage_claims (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             TEXT NOT NULL REFERENCES orders(order_id),
  video_url            TEXT NOT NULL,
  description          TEXT,
  status               TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  replacement_order_id TEXT,
  admin_notes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COUPONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT UNIQUE NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'percent', 'flat')),
  value                INTEGER NOT NULL,
  min_subtotal         INTEGER DEFAULT 0,
  min_total            NUMERIC DEFAULT 0,
  max_discount         INTEGER,
  expiry_date          TIMESTAMPTZ,
  expiry_at            TIMESTAMPTZ,
  total_limit          INTEGER,
  per_user_limit       INTEGER DEFAULT 1,
  usage_count          INTEGER DEFAULT 0,
  max_uses             INTEGER,
  category_restrict    UUID[],
  product_exclude      UUID[],
  combo_exclude        BOOLEAN DEFAULT FALSE,
  auto_apply_condition TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COUPON USAGE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  customer_id UUID REFERENCES customers(id),
  order_id    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id),
  customer_name     TEXT NOT NULL,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title             TEXT,
  body              TEXT,
  comment           TEXT,
  image_urls        TEXT[],
  photo_url         TEXT DEFAULT NULL,
  video_url         TEXT,
  order_id          TEXT DEFAULT NULL,
  is_approved       BOOLEAN DEFAULT FALSE,
  is_featured       BOOLEAN DEFAULT FALSE,
  is_hidden         BOOLEAN DEFAULT FALSE,
  admin_reply       TEXT,
  helpful_count     INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  source            TEXT DEFAULT 'website',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN reviews.photo_url IS 'Customer-uploaded photo with review. Only stored if review_photo_enabled=true.';

-- ─── COMBOS / BUNDLES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  image_url       TEXT,
  badge_text      TEXT,
  items           JSONB NOT NULL,
  original_price  INTEGER NOT NULL,
  combo_price     INTEGER NOT NULL,
  savings_percent INTEGER DEFAULT 0,
  display_order   INTEGER DEFAULT 0,
  category        TEXT DEFAULT 'general',
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMBO PRODUCTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combo_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id      UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity      INTEGER DEFAULT 1,
  display_name  TEXT,
  display_image TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BLOG POSTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT NOT NULL,
  excerpt         TEXT,
  featured_image  TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  meta_title      TEXT,
  meta_description TEXT,
  category        TEXT,
  tags            TEXT[],
  is_published    BOOLEAN DEFAULT FALSE,
  product_links   UUID[],
  author          TEXT DEFAULT 'ChitraFrame',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAGES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  seo_title       TEXT,
  seo_description TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAGE VERSIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  version    INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FAQ ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PINCODE RISK ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pincode_risk (
  pincode_prefix TEXT PRIMARY KEY,
  total_orders   INTEGER DEFAULT 0,
  rto_count      INTEGER DEFAULT 0,
  cod_blocked    BOOLEAN DEFAULT FALSE,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ADMIN USERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('superadmin', 'manager', 'logistics', 'support')),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL LOG ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT,
  recipient     TEXT NOT NULL,
  type          TEXT NOT NULL,
  subject       TEXT,
  service       TEXT CHECK (service IN ('brevo', 'resend')),
  status        TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL FAILURES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_failures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT,
  recipient   TEXT,
  type        TEXT,
  subject     TEXT,
  body        TEXT,
  error       TEXT,
  service     TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMAIL LOGS (v2 table — used by migration_v2) ────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email    TEXT NOT NULL,
  type     TEXT NOT NULL,
  order_id TEXT,
  sent_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,
  phone       TEXT,
  name        TEXT,
  source      TEXT DEFAULT 'exit_intent',
  utm_source  TEXT,
  utm_medium  TEXT,
  opted_in    BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANALYTICS EVENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  product_id   UUID,
  customer_id  UUID,
  session_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SALES FUNNEL EVENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_funnel_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,
  product_id   UUID,
  order_id     TEXT,
  session_id   TEXT,
  email        TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VIEW STATS (atomic traffic tracker) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS view_stats (
  path           TEXT PRIMARY KEY,
  count          BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AD PERFORMANCE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_performance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  platform    TEXT NOT NULL,
  campaign    TEXT,
  category    TEXT,
  ad_spend    INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  orders      INTEGER DEFAULT 0,
  revenue     INTEGER DEFAULT 0,
  cac         INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, platform, COALESCE(campaign, ''))
);

-- ─── ERROR LOG ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      TEXT,
  method        TEXT,
  error_message TEXT NOT NULL,
  stack_trace   TEXT,
  ref_id        TEXT,
  request_body  JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUGGESTIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suggestions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message       TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status        TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'actioned')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEW REQUESTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(order_id),
  customer_email   TEXT NOT NULL,
  customer_name    TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  review_submitted BOOLEAN DEFAULT false,
  review_id        UUID REFERENCES reviews(id)
);

-- ─── SEO TASKS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_tasks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('site', 'product', 'blog')),
  entity_id    TEXT,
  entity_name  TEXT,
  generated_by TEXT DEFAULT 'openrouter',
  model_used   TEXT,
  result_json  JSONB,
  applied      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug       ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_hidden     ON products(is_hidden);
CREATE INDEX IF NOT EXISTS idx_products_featured   ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product      ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_id     ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment      ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_email        ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_claims_order        ON damage_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_order     ON email_log(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created   ON email_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source        ON leads(source);
CREATE INDEX IF NOT EXISTS idx_reviews_product     ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved    ON reviews(is_approved, is_hidden);
CREATE INDEX IF NOT EXISTS idx_analytics_type      ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created   ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfunnel_type        ON sales_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sfunnel_created     ON sales_funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfunnel_utm         ON sales_funnel_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_customers_email     ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_auth      ON customers(auth_id);
CREATE INDEX IF NOT EXISTS idx_blog_slug           ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_coupons_code        ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_combos_active       ON combos(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_combo_products      ON combo_products(combo_id);
CREATE INDEX IF NOT EXISTS idx_admin_email         ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_ad_perf_date        ON ad_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_perf_platform    ON ad_performance(platform);
CREATE INDEX IF NOT EXISTS idx_error_created       ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_requests_order ON review_requests(order_id);

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq                ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_stats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (idempotent)
DROP POLICY IF EXISTS "customers_own_data"    ON customers;
DROP POLICY IF EXISTS "customers_update_own"  ON customers;
DROP POLICY IF EXISTS "addresses_own_data"    ON customer_addresses;
DROP POLICY IF EXISTS "orders_own_data"       ON orders;
DROP POLICY IF EXISTS "wishlists_own_data"    ON wishlists;
DROP POLICY IF EXISTS "admins_read_self"      ON admin_users;
DROP POLICY IF EXISTS "products_public_read"  ON products;
DROP POLICY IF EXISTS "variants_public_read"  ON product_variants;
DROP POLICY IF EXISTS "images_public_read"    ON product_images;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "reviews_public_read"   ON reviews;
DROP POLICY IF EXISTS "blog_public_read"      ON blog_posts;
DROP POLICY IF EXISTS "pages_public_read"     ON pages;
DROP POLICY IF EXISTS "faq_public_read"       ON faq;
DROP POLICY IF EXISTS "combos_public_read"    ON combos;
DROP POLICY IF EXISTS "service_role_all_view_stats"         ON view_stats;
DROP POLICY IF EXISTS "service_role_all_sales_funnel_events" ON sales_funnel_events;
DROP POLICY IF EXISTS "service_role_all_email_logs"         ON email_logs;
DROP POLICY IF EXISTS "service_role_all_coupons"            ON coupons;
DROP POLICY IF EXISTS "anon_read_coupons"                   ON coupons;

CREATE POLICY "customers_own_data"    ON customers          FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "customers_update_own"  ON customers          FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "addresses_own_data"    ON customer_addresses FOR ALL    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "orders_own_data"       ON orders             FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "wishlists_own_data"    ON wishlists          FOR ALL    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "admins_read_self"      ON admin_users        FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "products_public_read"  ON products           FOR SELECT USING (is_active = TRUE);
CREATE POLICY "variants_public_read"  ON product_variants   FOR SELECT USING (TRUE);
CREATE POLICY "images_public_read"    ON product_images     FOR SELECT USING (TRUE);
CREATE POLICY "categories_public_read" ON categories        FOR SELECT USING (is_active = TRUE);
CREATE POLICY "reviews_public_read"   ON reviews            FOR SELECT USING (is_approved = TRUE AND is_hidden = FALSE);
CREATE POLICY "blog_public_read"      ON blog_posts         FOR SELECT USING (is_published = TRUE);
CREATE POLICY "pages_public_read"     ON pages              FOR SELECT USING (TRUE);
CREATE POLICY "faq_public_read"       ON faq                FOR SELECT USING (is_active = TRUE);
CREATE POLICY "combos_public_read"    ON combos             FOR SELECT USING (is_active = TRUE);
CREATE POLICY "service_role_all_view_stats"          ON view_stats           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_sales_funnel_events" ON sales_funnel_events  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_email_logs"          ON email_logs           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_coupons"             ON coupons              FOR ALL TO service_role USING (true);
CREATE POLICY "anon_read_coupons"                    ON coupons              FOR SELECT TO anon USING (is_active = true);

-- ============================================================================
-- SECTION 4: FUNCTIONS & RPC
-- ============================================================================

-- Atomic order sequence (CF-YYMMDD-XXXX)
CREATE OR REPLACE FUNCTION increment_order_sequence(p_date_key TEXT)
RETURNS INTEGER AS $$
DECLARE new_seq INTEGER;
BEGIN
  INSERT INTO order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_sequence = order_sequence.last_sequence + 1
  RETURNING last_sequence INTO new_seq;
  RETURN new_seq;
END;
$$ LANGUAGE plpgsql;

-- Increment customer stats on order placed
CREATE OR REPLACE FUNCTION increment_customer_stats(p_customer_id UUID, p_order_total INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    total_orders = total_orders + 1,
    total_spend  = total_spend + p_order_total,
    updated_at   = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Atomic view tracker (called from frontend / edge worker)
CREATE OR REPLACE FUNCTION increment_view(target_path TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO view_stats (path, count, last_viewed_at)
  VALUES (target_path, 1, NOW())
  ON CONFLICT (path) DO UPDATE
    SET count = view_stats.count + 1,
        last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant view tracking to anonymous users
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO service_role;

-- ============================================================================
-- SECTION 5: SYSTEM CONFIG DEFAULTS (ChitraFrame branded)
-- ============================================================================

INSERT INTO system_config (key, value, description) VALUES
  -- ── Brand ─────────────────────────────────────────────────────────────────
  ('brand_name',                 'ChitraFrame',  'Brand display name'),
  ('brand_domain',               'chitraframe.in', 'Primary domain'),
  -- ── Checkout & Payments ──────────────────────────────────────────────────
  ('checkout_mode',              'custom',       'Primary checkout: custom or shiprocket'),
  ('cod_enabled',                'false',        'Global COD toggle — disabled at launch'),
  ('cod_min_value',              '899',          'Minimum order value for COD (₹)'),
  ('cod_max_value',              '1995',         'Maximum order value for COD (₹)'),
  ('cod_fee',                    '49',           'COD confirmation fee (₹)'),
  ('free_shipping_threshold',    '899',          'Free shipping above this amount for prepaid (₹)'),
  ('shipping_charge',            '99',           'Standard shipping charge (₹)'),
  ('prepaid_discount',           '50',           'Flat discount for prepaid orders (₹)'),
  ('premium_frame_surcharge',    '250',          'Extra charge for Premium frame / white mount (₹)'),
  ('white_mount_price',          '250',          'White mount add-on price (₹)'),
  ('poster_addon_price',         '199',          'Poster print add-on price (₹)'),
  -- ── Volume Discounts ─────────────────────────────────────────────────────
  ('volume_discount_2',          '100',          'Discount for 2 items (₹)'),
  ('volume_discount_3',          '250',          'Discount for 3 items (₹)'),
  ('volume_discount_5_pct',      '20',           'Discount % for 5+ items'),
  -- ── Operations ───────────────────────────────────────────────────────────
  ('pickup_pincode',             '501504',       'Warehouse pickup pincode'),
  ('acrylic_enabled',            'false',        'Acrylic upgrade option toggle'),
  ('combos_enabled',             'true',         'Global combos/bundles toggle'),
  ('exit_intent_enabled',        'true',         'Exit intent popup toggle'),
  ('review_photo_enabled',       'true',         'Allow photos with reviews'),
  ('poster_enabled',             'false',        'Poster-only (no frame) option'),
  -- ── Shipping ─────────────────────────────────────────────────────────────
  ('shipping_prepaid_below_floor','79',          'Shipping for prepaid below free threshold (₹)'),
  ('shipping_cod_small_medium',  '99',           'Shipping for COD Small/Medium (₹)'),
  ('shipping_cod_large_xl',      '149',          'Shipping for COD Large/XL (₹)'),
  -- ── Contact & Business ────────────────────────────────────────────────────
  ('contact_email',              'support@chitraframe.in', 'Customer support email'),
  ('contact_phone',              '',             'Customer support phone'),
  ('contact_address',            'Hyderabad, Telangana, India', 'Store address'),
  ('whatsapp_number',            '',             'WhatsApp number (with country code, no +)'),
  ('whatsapp_disputes',          '',             'WhatsApp for disputes'),
  -- ── Social Links ─────────────────────────────────────────────────────────
  ('instagram_handle',           '@chitraframe.in',   'Instagram handle'),
  ('instagram_link',             '',             'Instagram profile URL'),
  ('facebook_link',              '',             'Facebook page URL'),
  -- ── Announcement Bar ─────────────────────────────────────────────────────
  ('announcement_active',        'true',         'Show announcement bar'),
  ('announcement_text',          'Free Shipping on orders ₹899+ • Prepaid discount ₹50 • Pan-India Delivery', 'Announcement bar text'),
  ('announcement_link',          '/shop',        'Announcement bar link'),
  ('announcement_bg',            '#1A1A1A',      'Announcement bar background colour'),
  -- ── Urgency / CRO ────────────────────────────────────────────────────────
  ('urgency_text',               'Limited Stock Available', 'Urgency message on product pages'),
  ('urgency_subtext',            'Order today for fastest delivery', 'Urgency sub-message'),
  ('festival_mode',              '',             'Active festival: diwali, navratri, janmashtami…'),
  -- ── SEO ──────────────────────────────────────────────────────────────────
  ('seo_title',                  'ChitraFrame | Premium Framed Wall Art Online India', 'Homepage SEO title'),
  ('seo_description',            'Buy premium framed wall art online in India. Spiritual, automotive, sports & motivational art. Museum-quality prints, solid wood frames. Free delivery ₹899+. chitraframe.in', 'Homepage SEO description'),
  ('og_image',                   '',             'Homepage OG/social share image URL'),
  -- ── Hero Banner ──────────────────────────────────────────────────────────
  ('hero_banner_title',          'Art That Speaks. Frames That Last.',           'Homepage hero heading'),
  ('hero_banner_subtitle',       'Spiritual, Automotive, Sports — curated wall art delivered across India.', 'Homepage hero subheading'),
  ('hero_banner_cta_text',       'Explore Catalog',  'Hero CTA button text'),
  ('hero_banner_cta_link',       '/shop',        'Hero CTA button link'),
  -- ── Category Hero Titles ─────────────────────────────────────────────────
  ('spiritual_hero_title',       'Sacred Art for Sacred Spaces',                'Spiritual category hero title'),
  ('spiritual_hero_subtitle',    'Mahadev, Hanuman, Ganesha, Radha Krishna — framed in devotion', 'Spiritual category hero subtitle'),
  ('automotive_hero_title',      'Speed. Elegance. Obsession.',                 'Automotive category hero title'),
  ('automotive_hero_subtitle',   'Porsche, BMW M4, F1, Superbikes — frame the machines you love', 'Automotive category hero subtitle'),
  -- ── Analytics & Tracking ─────────────────────────────────────────────────
  ('gtm_container_id',           '',             'Google Tag Manager container ID'),
  -- ── Pricing Reference ────────────────────────────────────────────────────
  ('price_small',                '499',          'Small (8×12") framed price ₹'),
  ('price_medium',               '799',          'Medium (12×18") framed price ₹'),
  ('price_large',                '1149',         'Large (18×24") framed price ₹'),
  ('price_xl',                   '1749',         'XL (24×36") framed price ₹'),
  ('price_premium_addon',        '250',          'Premium white mount add-on ₹'),
  ('price_cod_fee',              '49',           'COD confirmation fee ₹'),
  ('price_prepaid_discount',     '50',           'Prepaid discount ₹'),
  ('price_shipping',             '99',           'Standard shipping ₹'),
  ('price_free_shipping_threshold','899',        'Free shipping threshold ₹'),
  -- ── Ad Performance Benchmarks ────────────────────────────────────────────
  ('ads_budget_monthly',         '3000',         'Monthly ad budget (₹)'),
  ('cac_instagram',              '0',            'Last known CAC from Instagram Ads (₹)'),
  -- ── About ─────────────────────────────────────────────────────────────────
  ('about_content',              'ChitraFrame is your destination for premium framed wall art. Spiritual, automotive, sports and motivational designs — printed on 300gsm museum-grade paper in solid wood frames. Fast delivery across India.', 'About us text')
ON CONFLICT (key) DO NOTHING;

-- ── site_config mirror (used by some routes) ─────────────────────────────────
INSERT INTO site_config (key, value) VALUES
  ('brand_name',              'ChitraFrame'),
  ('seo_title',               'ChitraFrame | Premium Framed Wall Art Online India — chitraframe.in'),
  ('seo_description',         'Buy premium framed wall art online in India. Spiritual, automotive, sports & motivational. Museum-quality prints. Free delivery ₹899+.'),
  ('announcement_text',       'Free Shipping on orders ₹899+ • Prepaid discount ₹50 • Pan-India Delivery'),
  ('announcement_active',     'true'),
  ('free_shipping_threshold', '899'),
  ('poster_addon_price',      '199'),
  ('contact_email',           'support@chitraframe.in'),
  ('price_small',             '499'),
  ('price_medium',            '799'),
  ('price_large',             '1149'),
  ('price_xl',                '1749'),
  ('price_premium_addon',     '250'),
  ('price_cod_fee',           '49'),
  ('price_prepaid_discount',  '50'),
  ('price_shipping',          '99'),
  ('promo_banner_active',     'true'),
  ('promo_banner_text',       'Free Shipping on orders ₹899+! Use code FRAME50 for ₹50 off prepaid orders.'),
  ('promo_code_FRAME50',      '{"type":"fixed","amount":50,"min_order":499,"valid_until":"2026-12-31"}'),
  ('cod_enabled',             'false'),
  ('brand_tagline',           'Art that speaks. Frames that last.'),
  ('current_offers',          '["Free shipping on ₹899+","Prepaid discount ₹50","Combo deals on 2+ frames"]'),
  ('featured_categories',     '["spiritual","automotive","sports","wildlife","motivational","legend"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- SECTION 6: CATEGORIES SEED
-- ============================================================================

-- Primary product categories
INSERT INTO categories (name, slug, description, hover_color, display_order, is_active,
                        hero_title, hero_subtitle, hero_badge) VALUES
  ('Spiritual & Devotional', 'spiritual',    'Divine art — Mahadev, Hanuman, Ganesha, Radha Krishna, Ram Darbar',    '#7C3AED', 1, true,
   'Sacred Art for Sacred Spaces', 'Mahadev, Hanuman, Ganesha, Radha Krishna — framed in devotion', '🕉️ Spiritual'),
  ('Sports Legends',         'sports',       'Football icons — Cristiano Ronaldo, Lionel Messi',                    '#22C55E', 2, true,
   'Champions on Your Wall', 'CR7, Messi — iconic sports moments immortalised', '⚽ Sports'),
  ('Automotive',             'automotive',   'Exotic cars & superbikes — Porsche 911, BMW M4, Formula 1',           '#E8670A', 3, true,
   'Speed. Elegance. Obsession.', 'Porsche, BMW M4, F1, Superbikes — frame the machines you love', '🏎️ Speed & Style'),
  ('Legend & Pop Culture',   'legend',       'Anime & pop culture — Goku, Naruto, Luffy + lifestyle art',           '#FF69B4', 4, true,
   'Icons of Legend', 'Anime, pop culture, and lifestyle art for every wall', '⚡ Legend'),
  ('Wildlife & Nature',      'wildlife',     'Majestic wildlife — Lion & Wolf art prints',                          '#10B981', 5, true,
   'Wild & Majestic', 'Lion, Wolf — power and grace in premium art', '🦁 Wildlife'),
  ('Motivational',           'motivational', 'Typographic motivational quotes for focus & hustle',                  '#C9973A', 6, true,
   'Fuel Your Ambition', 'Bold typographic art to power your mindset daily', '💪 Motivation')
ON CONFLICT (slug) DO UPDATE SET
  description   = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  hover_color   = EXCLUDED.hover_color,
  hero_title    = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  hero_badge    = EXCLUDED.hero_badge,
  is_active     = EXCLUDED.is_active;

-- Legacy category slugs (for backward compatibility)
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Divine',              'divine',              'Sacred art — Ganesha, Shiva, Hanuman, Krishna, Rama',  10, true),
  ('Motivation',          'motivation',          'Inspiring motivational art',                            11, true),
  ('Anime & Pop Culture', 'anime-pop-culture',   'Anime and pop culture art',                            12, true),
  ('Nature & Landscape',  'nature-landscape',    'Nature photography and landscape art',                 13, true),
  ('Minimal & Abstract',  'minimal-abstract',    'Clean minimal and abstract designs',                   14, true),
  ('Custom Frames',       'custom-frames',       'Upload your own photo and get it framed',              15, true)
ON CONFLICT (slug) DO NOTHING;

-- Intent-based collections
INSERT INTO categories (name, slug, description, display_order, is_active, is_intent_collection) VALUES
  ('Gifts Under ₹999',   'gifts-under-999',     'Perfect gifts that won''t break the bank', 100, true, true),
  ('Bedroom Aesthetic',  'bedroom-aesthetic',   'Curated picks to transform your bedroom',  101, true, true),
  ('Study/Work Setup',   'study-work-setup',    'Motivational art for your workspace',      102, true, true),
  ('Couple/Romantic',    'couple-romantic',     'Romantic wall art for couples',            103, true, true),
  ('Festival Collection','festival-collection', 'Seasonal festival specials',               104, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Category Cloudinary image URLs
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/spiritual.jpg'    WHERE slug = 'spiritual';
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/sports.jpg'       WHERE slug = 'sports';
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/automotive.jpg'   WHERE slug = 'automotive';
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/legend.jpg'       WHERE slug = 'legend';
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/wildlife.jpg'     WHERE slug = 'wildlife';
UPDATE categories SET image_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_800/chitraframe/categories/motivational.jpg' WHERE slug = 'motivational';

-- ============================================================================
-- SECTION 7: ADMIN USER SEED
-- ============================================================================
-- IMPORTANT: Replace the email below with YOUR email.
-- Then create this email as a user in Supabase Auth → Users → Add user.
-- The admin panel login uses: email + ADMIN_PASSWORD (Cloudflare secret).

INSERT INTO admin_users (email, role, is_active)
VALUES ('admin@chitraframe.in', 'superadmin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SECTION 8: FULL PRODUCT CATALOG (51 designs)
-- ============================================================================

INSERT INTO products (slug, name, category_id, description, short_description, seo_title, seo_description, tags, is_active, is_featured, display_order)
SELECT
  p.slug, p.name,
  (SELECT id FROM categories WHERE slug = p.cat),
  p.desc, p.short_desc, p.seo_title, p.seo_desc,
  p.tags, true, p.featured, p.ord
FROM (VALUES

  -- ── SPIRITUAL ────────────────────────────────────────────────────────────
  ('mahadev-cosmic-trance',   'Mahadev Cosmic Trance',         'spiritual',
   'An ethereal depiction of Lord Shiva in deep cosmic meditation, surrounded by swirling galaxies and celestial energy. Golden and indigo hues create a transcendental atmosphere.',
   'Shiva in cosmic meditation — galaxies, gold & indigo',
   'Mahadev Cosmic Trance Wall Art | Buy Shiva Poster India | ChitraFrame',
   'Buy Mahadev Cosmic Trance framed wall art online India. Premium quality Shiva poster in gold & indigo. Ships pan-India. ₹499 onwards.',
   ARRAY['mahadev','shiva','spiritual','cosmic','lord shiva poster india'], true, 1),

  ('mahadev-galaxy-medit',    'Mahadev Galaxy Meditation',     'spiritual',
   'Lord Shiva seated in lotus pose against a breathtaking galaxy backdrop. Interplay of deep blues, purples and warm gold creates a mesmerising sacred art piece.',
   'Galaxy meditation Shiva in purple & blue cosmic art',
   'Mahadev Galaxy Meditation Poster | Shiva Wall Art India | ChitraFrame',
   'Mahadev Galaxy Meditation framed art print. Shiva in lotus pose against a galaxy. Premium frames ₹499+. Free shipping ₹899+.',
   ARRAY['mahadev','shiva','galaxy','meditation','spiritual wall art india'], true, 2),

  ('mahadev-neon-dark',       'Mahadev Neon Dark Minimal',     'spiritual',
   'A bold minimalist portrait of Lord Shiva rendered in neon outlines against a pitch-black background. Perfect for modern interiors seeking a striking spiritual statement piece.',
   'Bold neon-line Shiva portrait on matte black',
   'Mahadev Neon Minimal Poster | Modern Shiva Wall Art | ChitraFrame',
   'Mahadev Neon Dark Minimal wall art. Striking Shiva portrait in neon on black. Ships across India. ₹499 onwards.',
   ARRAY['mahadev','neon art','minimal','shiva','dark wall art'], true, 3),

  ('mahadev-adiyogi-blue',    'Mahadev Adiyogi Blue Flame',    'spiritual',
   'The iconic Adiyogi silhouette engulfed in celestial blue flames, evoking the first yogi and source of yogic wisdom. A powerful centrepiece for any living room or home office.',
   'Adiyogi Shiva silhouette in electric blue flames',
   'Adiyogi Blue Flame Wall Art | Mahadev Poster India | ChitraFrame',
   'Adiyogi Blue Flame framed poster — striking Shiva art for home. ₹499+. Pan-India delivery.',
   ARRAY['adiyogi','mahadev','blue flame','yoga','spiritual art india'], true, 4),

  ('hanuman-bhakti-fire',     'Hanuman Bhakti Fire',           'spiritual',
   'Lord Hanuman in his divine fiery form — fierce devotion and immense strength captured in warm amber and red hues. An art piece that invokes courage and protection.',
   'Fiery Hanuman in amber and crimson devotional art',
   'Hanuman Bhakti Fire Poster | Hanuman Wall Art India | ChitraFrame',
   'Hanuman Bhakti Fire framed wall art. Premium devotional poster. Ships across India. ₹499 onwards.',
   ARRAY['hanuman','bhakti','fire','devotional art','hanuman poster india'], true, 5),

  ('hanuman-warrior-peak',    'Hanuman Warrior of the Peak',   'spiritual',
   'Lord Hanuman atop a mountain peak, carrying the Sanjeevani herb, rendered in dramatic light and shadow. A triumphant depiction of devotion, strength and selfless service.',
   'Hanuman carrying Sanjeevani — epic warrior art',
   'Hanuman Warrior Peak Poster | Buy Hanuman Art India | ChitraFrame',
   'Hanuman Warrior of the Peak — dramatic framed art. ₹499+. Ships pan-India.',
   ARRAY['hanuman','warrior','sanjeevani','mountain','hanuman wall art'], false, 6),

  ('hanuman-devotion-art',    'Hanuman Devotion Art',          'spiritual',
   'A soul-stirring portrait of Hanuman in peaceful devotion, with warm saffron and golden tones creating a serene spiritual ambiance. Perfect for pooja rooms.',
   'Peaceful Hanuman portrait in saffron and gold',
   'Hanuman Devotion Art Poster | Spiritual Wall Art India | ChitraFrame',
   'Hanuman Devotion Art — serene framed poster for pooja rooms. ₹499+. Pan-India shipping.',
   ARRAY['hanuman','devotion','saffron','spiritual','pooja room art'], false, 7),

  ('ganesh-purple-cosmos',    'Ganesh Purple Cosmos',          'spiritual',
   'Lord Ganesha surrounded by a cosmic purple universe, symbolising the remover of obstacles across all dimensions. Rich purple and gold tones make this a majestic conversation piece.',
   'Ganesha in cosmic purple universe — remover of obstacles',
   'Ganesh Purple Cosmos Poster | Ganesha Wall Art India | ChitraFrame',
   'Ganesh Purple Cosmos framed wall art. Stunning Ganesha poster in purple & gold. ₹499+. Ships across India.',
   ARRAY['ganesha','ganesh','purple','cosmic','ganesh poster india'], true, 8),

  ('ganesh-gold-mandala',     'Ganesh Gold Mandala',           'spiritual',
   'Lord Ganesha at the centre of an intricate golden mandala, radiating prosperity and wisdom. The detailed mandala work and rich gold palette make this a premium spiritual art piece.',
   'Ganesha in golden mandala — prosperity and wisdom',
   'Ganesh Gold Mandala Poster | Buy Ganesha Art India | ChitraFrame',
   'Ganesh Gold Mandala — ornate framed art print. Perfect housewarming gift India. ₹499+.',
   ARRAY['ganesha','mandala','gold','spiritual','housewarming gift india'], false, 9),

  ('ganesh-sacred-geometry',  'Ganesh Sacred Geometry',        'spiritual',
   'A contemporary interpretation of Lord Ganesha using sacred geometry patterns, blending ancient spirituality with modern art aesthetics.',
   'Modern sacred geometry Ganesha art for contemporary homes',
   'Ganesh Sacred Geometry Poster | Modern Ganesha Art | ChitraFrame',
   'Ganesh Sacred Geometry — modern spiritual wall art. Premium frames. ₹499+. Ships pan-India.',
   ARRAY['ganesha','sacred geometry','modern art','spiritual','geometric art'], false, 10),

  ('radha-krishna-watercolor', 'Radha Krishna Watercolor Garden', 'spiritual',
   'A romantic watercolour depiction of Radha and Krishna in a blooming garden, with soft pastels evoking eternal divine love. A timeless piece for bedrooms and living rooms.',
   'Romantic Radha Krishna watercolour in soft pastels',
   'Radha Krishna Watercolor Poster | Buy Krishna Art India | ChitraFrame',
   'Radha Krishna Watercolor Garden — romantic framed art. Perfect wedding gift India. ₹499+.',
   ARRAY['radha krishna','watercolor','romantic','divine love','krishna art india'], true, 11),

  ('radha-krishna-teal-gold', 'Radha Krishna Teal & Gold',     'spiritual',
   'Lord Krishna and Radha in a stunning teal and gold colour palette — contemporary yet deeply spiritual. A statement piece combining elegance with devotional energy.',
   'Radha Krishna in striking teal & gold contemporary art',
   'Radha Krishna Teal Gold Poster | Premium Krishna Art | ChitraFrame',
   'Radha Krishna Teal & Gold — premium framed art. Elegant spiritual wall decor India. ₹499+.',
   ARRAY['radha krishna','teal','gold','contemporary spiritual','krishna poster'], false, 12),

  ('radha-krishna-devotion',  'Radha Krishna Eternal Devotion','spiritual',
   'A devotional masterpiece capturing the eternal bond between Radha and Krishna, rendered in warm ambers and deep blues. Carries divine energy and timeless artistic beauty.',
   'Eternal devotion Radha Krishna in warm amber & deep blue',
   'Radha Krishna Devotion Poster | Spiritual Art India | ChitraFrame',
   'Radha Krishna Eternal Devotion — framed spiritual art. ₹499+. Ships across India.',
   ARRAY['radha krishna','devotion','eternal','spiritual','devotional art india'], false, 13),

  ('ram-darbar-classic',      'Ram Darbar Classic',            'spiritual',
   'The auspicious Ram Darbar — Lord Ram, Sita, Lakshmana and Hanuman in classical style. A sacred composition that brings divine blessings into your home. Ideal for pooja rooms.',
   'Classical Ram Darbar — Ram, Sita, Lakshman, Hanuman',
   'Ram Darbar Classic Poster | Ram Sita Wall Art India | ChitraFrame',
   'Ram Darbar Classic framed art — auspicious home decor. ₹499+. Ships pan-India.',
   ARRAY['ram darbar','ram sita','hanuman','lakshmana','ram poster india'], true, 14),

  ('ram-darbar-royal',        'Ram Darbar Royal Court',        'spiritual',
   'Lord Ram''s royal court depicted in rich jewel tones — gold, crimson and royal blue — evoking the grandeur of Ayodhya. An exquisite piece for any devotional space.',
   'Royal Ram Darbar in jewel tones — gold, crimson & blue',
   'Ram Darbar Royal Poster | Buy Ram Art India | ChitraFrame',
   'Ram Darbar Royal Court — premium framed devotional art. ₹499+. Pan-India shipping.',
   ARRAY['ram darbar','ayodhya','royal','devotional','ram art india'], false, 15),

  ('sita-ram-watercolor',     'Sita Ram Watercolor Bliss',     'spiritual',
   'Lord Ram and Sita in a dreamy watercolour style, surrounded by nature''s bounty. Soft romantic hues make this a perfect wedding or housewarming gift.',
   'Dreamy watercolour Sita Ram in nature — wedding gift',
   'Sita Ram Watercolor Poster | Ram Sita Art India | ChitraFrame',
   'Sita Ram Watercolor Bliss — romantic framed art. Perfect wedding gift India. ₹499+.',
   ARRAY['sita ram','watercolor','wedding gift','devotional','ram sita art'], false, 16),

  ('sita-ram-devotional',     'Sita Ram Devotional Art',       'spiritual',
   'A devotional portrait of Sita and Ram in richly detailed traditional style, capturing the essence of their divine union. A meaningful addition to any home shrine.',
   'Traditional devotional Sita Ram portrait for home shrines',
   'Sita Ram Devotional Art | Ram Sita Poster India | ChitraFrame',
   'Sita Ram Devotional Art — traditional framed art print. ₹499+. Ships across India.',
   ARRAY['sita ram','devotional','traditional','shrine','ram sita poster'], false, 17),

  ('krishna-mahabharata-1',   'Krishna – Mahabharata Wisdom',  'spiritual',
   'Lord Krishna on the battlefield of Kurukshetra, delivering the timeless Bhagavad Gita. The dramatic contrast of blues and gold evokes the gravity of this eternal moment.',
   'Krishna on Kurukshetra battlefield delivering Gita wisdom',
   'Krishna Mahabharata Poster | Bhagavad Gita Wall Art India | ChitraFrame',
   'Krishna Mahabharata Wisdom — premium framed art. Bhagavad Gita wall art for home. ₹499+.',
   ARRAY['krishna','mahabharata','bhagavad gita','kurukshetra','krishna poster india'], true, 18),

  ('krishna-mahabharata-2',   'Krishna – Cosmic Vision',       'spiritual',
   'Lord Krishna revealing his cosmic Vishwaroop — a dramatic, awe-inspiring depiction of divine omnipresence. A centrepiece for any spiritual or living space.',
   'Krishna Vishwaroop cosmic form — awe-inspiring divine art',
   'Krishna Cosmic Vision Poster | Vishwaroop Art India | ChitraFrame',
   'Krishna Cosmic Vision — Vishwaroop framed art. Stunning spiritual wall decor. ₹499+.',
   ARRAY['krishna','vishwaroop','cosmic','mahabharata','krishna art india'], false, 19),

  -- ── SPORTS ───────────────────────────────────────────────────────────────
  ('cr7-golden-era',          'Cristiano Ronaldo – Golden Era','sports',
   'Celebrate the greatest of all time with this stunning Cristiano Ronaldo golden era art print. Bold gold and black tones capture the champion''s relentless pursuit of excellence.',
   'CR7 golden era art — bold gold & black champion print',
   'Cristiano Ronaldo Poster India | CR7 Wall Art | ChitraFrame',
   'Cristiano Ronaldo Golden Era — premium framed sports art. CR7 poster India. ₹499+.',
   ARRAY['cristiano ronaldo','CR7','football','sports art','ronaldo poster india'], true, 1),

  ('cr7-celebration',         'Cristiano Ronaldo – Celebration','sports',
   'CR7''s iconic celebration moment immortalised in stunning detail — the signature jump, the fist pump, the SIUU energy. A must-have for every Ronaldo fan.',
   'CR7 iconic celebration art — energy, power, SIUU',
   'CR7 Celebration Poster India | Ronaldo Wall Art | ChitraFrame',
   'CR7 Celebration — Cristiano Ronaldo framed art. ₹499+. Ships across India.',
   ARRAY['cristiano ronaldo','CR7','celebration','SIUU','football poster india'], false, 2),

  ('cr7-siuu-moment',         'Cristiano Ronaldo – SIUU Moment','sports',
   'The electrifying SIUU moment captured in art — CR7 at the peak of his celebratory jump, arms wide, exuding pure confidence.',
   'CR7 SIUU jump celebration — pure confidence captured',
   'CR7 SIUU Poster India | Ronaldo Art Print | ChitraFrame',
   'CR7 SIUU Moment — iconic Ronaldo wall art. ₹499+. Perfect for sports rooms & gyms.',
   ARRAY['CR7','SIUU','ronaldo','celebration','football wall art india'], false, 3),

  ('messi-world-cup-glory',   'Messi – World Cup Glory',       'sports',
   'Leo Messi lifting the FIFA World Cup 2022 trophy — the defining moment of football history. This spectacular art print celebrates the GOAT achieving his destiny.',
   'Messi lifting World Cup 2022 — the GOAT''s destiny fulfilled',
   'Messi World Cup Poster India | Leo Messi Wall Art | ChitraFrame',
   'Messi World Cup Glory — premium framed football art. ₹499+. Ships across India.',
   ARRAY['messi','world cup','2022','GOAT','messi poster india'], true, 4),

  ('messi-goat-art',          'Messi – The GOAT',              'sports',
   'A powerful artistic tribute to Lionel Messi — the Greatest of All Time. Bold lines and rich colours celebrate a career of unparalleled brilliance.',
   'Messi GOAT tribute — bold art celebrating football genius',
   'Messi GOAT Poster India | Leo Messi Art Print | ChitraFrame',
   'Messi GOAT — iconic football art print India. ₹499+. Ships pan-India.',
   ARRAY['messi','GOAT','football','greatest of all time','messi wall art india'], false, 5),

  ('messi-magic-moment',      'Messi – Magic Moment',          'sports',
   'One of Messi''s iconic magic moments immortalised — the ball control, the vision, the unstoppable genius.',
   'Messi in his element — football artistry immortalised',
   'Messi Magic Moment Poster | Buy Messi Art India | ChitraFrame',
   'Messi Magic Moment — stunning football art print. ₹499+. Ships across India.',
   ARRAY['messi','magic','football','Barcelona','messi poster india'], false, 6),

  -- ── AUTOMOTIVE ───────────────────────────────────────────────────────────
  ('911-neon-tokyo',          'Porsche 911 Neon Tokyo Night',  'automotive',
   'A Porsche 911 blazing through neon-lit Tokyo streets — speed, luxury and urban energy in one breathtaking art print.',
   'Porsche 911 tearing through neon Tokyo — speed meets luxury',
   'Porsche 911 Neon Tokyo Poster | Car Wall Art India | ChitraFrame',
   'Porsche 911 Neon Tokyo Night — premium car art print India. ₹499+. Perfect for car lovers.',
   ARRAY['porsche 911','neon','tokyo','car art','porsche poster india'], true, 1),

  ('911-mountain-drive',      'Porsche 911 Mountain Drive',    'automotive',
   'A Porsche 911 carving through dramatic mountain hairpins at golden hour — the perfect union of machine and landscape.',
   'Porsche 911 on mountain roads — golden hour driving art',
   'Porsche 911 Mountain Drive Poster | Supercar Art India | ChitraFrame',
   'Porsche 911 Mountain Drive — stunning car art print. ₹499+. Ships pan-India.',
   ARRAY['porsche 911','mountain','drive','golden hour','supercar art india'], false, 2),

  ('911-sunset-turbo',        'Porsche 911 Sunset Turbo',      'automotive',
   'A Porsche 911 Turbo S silhouetted against a fiery sunset — power and elegance in perfect harmony.',
   'Porsche 911 Turbo S at sunset — power meets elegance',
   'Porsche 911 Sunset Poster | Premium Car Art India | ChitraFrame',
   'Porsche 911 Sunset Turbo — dramatic car wall art. ₹499+. Ships across India.',
   ARRAY['porsche 911','turbo','sunset','car art','porsche art india'], false, 3),

  ('m4-dark-carbon',          'BMW M4 Dark Carbon Edition',    'automotive',
   'The BMW M4 in sinister dark carbon finish — aggressive lines, raw power and uncompromising performance captured in art.',
   'BMW M4 in dark carbon — aggressive lines & raw power',
   'BMW M4 Dark Carbon Poster | BMW Wall Art India | ChitraFrame',
   'BMW M4 Dark Carbon Edition — premium car art print India. ₹499+. Ships pan-India.',
   ARRAY['BMW M4','dark carbon','car art','M4','bmw poster india'], true, 4),

  ('m4-racing-storm',         'BMW M4 Racing Storm',           'automotive',
   'The BMW M4 Competition in full racing mode — storming through the circuit in a blur of speed and precision.',
   'BMW M4 Competition at full race pace — pure adrenaline',
   'BMW M4 Racing Storm Poster | Motorsport Art India | ChitraFrame',
   'BMW M4 Racing Storm — motorsport art print. ₹499+. Ships across India.',
   ARRAY['BMW M4','racing','motorsport','competition','bmw racing art'], false, 5),

  ('m4-stealth-grey',         'BMW M4 Stealth Grey',           'automotive',
   'The BMW M4 in a commanding stealth grey finish — understated power and sophistication.',
   'BMW M4 stealth grey — understated power & sophistication',
   'BMW M4 Stealth Grey Poster | BMW Art India | ChitraFrame',
   'BMW M4 Stealth Grey — elegant car art print. ₹499+. Ships pan-India.',
   ARRAY['BMW M4','stealth grey','sophisticated','car art','bmw art india'], false, 6),

  ('f1-redbull-sparks',       'Formula 1 Red Bull Sparks',     'automotive',
   'A Red Bull Formula 1 car trailing brilliant sparks on a night circuit — the drama and spectacle of F1 captured in a single frame.',
   'F1 Red Bull trailing sparks on night circuit — F1 drama',
   'Formula 1 Red Bull Poster | F1 Wall Art India | ChitraFrame',
   'Formula 1 Red Bull Sparks — premium F1 art print India. ₹499+. Ships pan-India.',
   ARRAY['formula 1','red bull','F1','sparks','f1 poster india'], true, 7),

  ('f1-speed-art',            'Formula 1 Speed Art',           'automotive',
   'Pure speed abstracted into art — an F1 car reduced to motion blur and dynamic lines.',
   'F1 speed abstracted — motion blur motorsport art',
   'Formula 1 Speed Art Poster | F1 Wall Art India | ChitraFrame',
   'Formula 1 Speed Art — abstract motorsport wall art. ₹499+. Ships across India.',
   ARRAY['formula 1','speed','abstract','motorsport','F1 art india'], false, 8),

  ('f1-race-day',             'Formula 1 Race Day Glory',      'automotive',
   'The drama and spectacle of race day — multiple F1 cars battling into the first corner, sparks flying, history in the making.',
   'F1 race day action — multiple cars battling at first corner',
   'F1 Race Day Poster | Formula 1 Wall Art India | ChitraFrame',
   'Formula 1 Race Day Glory — action-packed F1 art. ₹499+. Ships pan-India.',
   ARRAY['formula 1','race day','motorsport','action','f1 wall art india'], false, 9),

  ('superbike-collection',    'SuperBike – Triple Crown',      'automotive',
   'Three of the world''s most iconic superbikes in one dramatic composition — power, speed and engineering excellence celebrated in art.',
   'Three iconic superbikes — power, speed & engineering art',
   'SuperBike Collection Poster | Motorcycle Art India | ChitraFrame',
   'SuperBike Triple Crown — premium motorcycle art print. ₹499+. Ships across India.',
   ARRAY['superbike','motorcycle','collection','bike art','superbike poster india'], true, 10),

  ('superbike-neon-rider',    'SuperBike Neon Rider',          'automotive',
   'A superbike and rider rendered in striking neon lines against pitch black — speed meets futuristic art.',
   'Superbike in neon lines on black — speed meets future art',
   'SuperBike Neon Rider Poster | Neon Bike Art India | ChitraFrame',
   'SuperBike Neon Rider — neon motorcycle art print. ₹499+. Ships pan-India.',
   ARRAY['superbike','neon','rider','motorcycle','neon art india'], false, 11),

  ('superbike-track-beast',   'SuperBike Track Beast',         'automotive',
   'A superbike unleashed on a race track — full lean, full throttle, full commitment. Raw intensity of track riding in dramatic art.',
   'Superbike on track at full lean — raw riding intensity',
   'SuperBike Track Poster | Racing Bike Art India | ChitraFrame',
   'SuperBike Track Beast — racing motorcycle art. ₹499+. Ships across India.',
   ARRAY['superbike','track','racing','motorcycle','bike racing art india'], false, 12),

  -- ── LEGEND ───────────────────────────────────────────────────────────────
  ('lambo-midnight-neon',     'Midnight Lambo – Neon SVJ',     'legend',
   'A Lamborghini Aventador SVJ bathed in midnight neon — hypercar meets cyberpunk. The ultimate wall statement for supercar dreamers.',
   'Lamborghini SVJ in midnight neon — cyberpunk supercar art',
   'Lamborghini Neon Poster India | Lambo Wall Art | ChitraFrame',
   'Midnight Lambo Neon SVJ — premium supercar art print. ₹499+. Ships pan-India.',
   ARRAY['lamborghini','neon','SVJ','supercar','lambo poster india'], true, 1),

  ('goku-ultra-instinct',     'Goku – Ultra Instinct Power',   'legend',
   'Son Goku in his awe-inspiring Ultra Instinct form — silver aura blazing, power beyond limits. A must-have for Dragon Ball Z fans.',
   'Goku Ultra Instinct — silver aura, limitless power DBZ art',
   'Goku Ultra Instinct Poster India | Dragon Ball Art | ChitraFrame',
   'Goku Ultra Instinct — premium Dragon Ball Z art print. ₹499+. Ships across India.',
   ARRAY['goku','ultra instinct','dragon ball','anime art','goku poster india'], true, 2),

  ('naruto-sage-mode',        'Naruto – Sage Mode',            'legend',
   'Naruto Uzumaki in powerful Sage Mode — nature energy flowing, sage marks glowing. A tribute to the future Hokage.',
   'Naruto in Sage Mode — sage marks, nature chakra art',
   'Naruto Sage Mode Poster India | Naruto Wall Art | ChitraFrame',
   'Naruto Sage Mode — premium anime art print. ₹499+. Ships pan-India.',
   ARRAY['naruto','sage mode','anime','hokage','naruto poster india'], true, 3),

  ('luffy-pirate-king',       'Luffy – Pirate King Wanted',    'legend',
   'Monkey D. Luffy with his iconic wanted poster aesthetic — the future Pirate King in full Gear 5 glory.',
   'Luffy Pirate King wanted poster — Gear 5 One Piece art',
   'Luffy Pirate King Poster India | One Piece Wall Art | ChitraFrame',
   'Luffy Pirate King Wanted — One Piece art print. ₹499+. Ships across India.',
   ARRAY['luffy','one piece','pirate king','gear 5','luffy poster india'], true, 4),

  ('woman-line-art-gold',     'Feminine Grace – Gold Line Art','legend',
   'An elegant gold line art portrait of a woman — minimalist, modern and deeply expressive. Perfect for bedrooms and living rooms.',
   'Minimalist gold line art woman — modern elegant decor',
   'Feminine Line Art Poster | Gold Line Art India | ChitraFrame',
   'Feminine Grace Gold Line Art — minimalist wall art. ₹499+. Ships pan-India.',
   ARRAY['line art','feminine','gold','minimalist','modern wall art india'], false, 5),

  ('beach-sunset-oil',        'Beach Sunset – Oil Paint',      'legend',
   'A stunning beach sunset rendered in oil paint style — warm oranges, soft pinks and gentle ocean waves create a calming retreat.',
   'Oil-paint-style beach sunset — calming coastal wall art',
   'Beach Sunset Oil Paint Poster | Coastal Wall Art India | ChitraFrame',
   'Beach Sunset Oil Paint — calming coastal art print. ₹499+. Ships across India.',
   ARRAY['beach','sunset','oil paint','coastal','beach art india'], false, 6),

  -- ── WILDLIFE ─────────────────────────────────────────────────────────────
  ('lion-geometric-gold',     'Lion – Geometric Gold Portrait','wildlife',
   'A majestic lion portrait composed of geometric gold shapes — combining the raw power of the king of the jungle with contemporary geometric art.',
   'Lion in geometric gold shapes — king of jungle meets modern art',
   'Lion Geometric Gold Poster | Lion Wall Art India | ChitraFrame',
   'Lion Geometric Gold Portrait — premium art print India. ₹499+. Ships pan-India.',
   ARRAY['lion','geometric','gold','wildlife','lion poster india'], true, 1),

  ('lion-dark-majestic',      'Lion – Dark Majestic',          'wildlife',
   'A lion portrait rendered in dramatic dark tones — deep blacks, midnight blues and golden highlights capture the raw, untamed majesty of the king.',
   'Lion in dramatic dark tones — untamed majesty captured',
   'Lion Dark Majestic Poster | Wildlife Art India | ChitraFrame',
   'Lion Dark Majestic — dramatic wildlife art print. ₹499+. Ships across India.',
   ARRAY['lion','dark','majestic','wildlife','lion art india'], false, 2),

  ('lion-warrior-spirit',     'Lion – Warrior Spirit',         'wildlife',
   'A powerful lion with a fierce warrior spirit — intense gaze, flowing mane, commanding presence. Inspires courage and determination.',
   'Lion warrior spirit — intense gaze, commanding presence',
   'Lion Warrior Spirit Poster | Wildlife Wall Art India | ChitraFrame',
   'Lion Warrior Spirit — inspiring wildlife art print. ₹499+. Ships pan-India.',
   ARRAY['lion','warrior','spirit','strength','lion wall art india'], false, 3),

  ('wolf-moonlight',          'Wolf – Moonlight Howl',         'wildlife',
   'A lone wolf howling at the full moon — wild, free and hauntingly beautiful. Dark blues, silver moonlight and dramatic atmosphere.',
   'Wolf howling at full moon — wild, free and hauntingly beautiful',
   'Wolf Moonlight Poster | Wolf Wall Art India | ChitraFrame',
   'Wolf Moonlight Howl — dramatic wildlife art print India. ₹499+. Ships pan-India.',
   ARRAY['wolf','moonlight','howl','wildlife','wolf poster india'], true, 4),

  ('wolf-forest-spirit',      'Wolf – Forest Spirit',          'wildlife',
   'A wolf as a forest spirit — ethereal, mysterious and deeply connected to nature. Soft greens, mist and magical lighting create an enchanting wildlife art piece.',
   'Wolf as forest spirit — ethereal nature connection art',
   'Wolf Forest Spirit Poster | Wildlife Art India | ChitraFrame',
   'Wolf Forest Spirit — enchanting wildlife art print. ₹499+. Ships across India.',
   ARRAY['wolf','forest','spirit','nature','wolf art india'], false, 5),

  ('wolf-alpha-dark',         'Wolf – Alpha Dark',             'wildlife',
   'The alpha wolf in commanding dark portrait — silver grey fur, piercing eyes and dominant presence.',
   'Alpha wolf in dark portrait — piercing eyes, dominant presence',
   'Wolf Alpha Dark Poster | Premium Wildlife Art India | ChitraFrame',
   'Wolf Alpha Dark — premium wildlife art print. ₹499+. Ships pan-India.',
   ARRAY['wolf','alpha','dark','wildlife','wolf wall art india'], false, 6),

  -- ── MOTIVATIONAL ─────────────────────────────────────────────────────────
  ('discipline-equals-freedom','Discipline = Freedom (Typographic)','motivational',
   '"Discipline Equals Freedom" — Jocko Willink''s powerful philosophy rendered in bold typographic art. Clean, commanding design for gyms, offices and focus rooms.',
   'Jocko Willink quote typographic art — discipline is freedom',
   'Discipline Equals Freedom Poster India | Motivational Wall Art | ChitraFrame',
   'Discipline = Freedom typographic poster. Premium motivational wall art India. ₹499+. Ships pan-India.',
   ARRAY['discipline','freedom','jocko','motivational','motivational poster india'], true, 1),

  ('grind-in-silence',        'Grind in Silence (Typographic)','motivational',
   '"Grind in Silence, Let Success Make the Noise" — a powerful reminder to focus on the work, not the noise. Bold typographic design for gyms and hustle spaces.',
   'Grind in Silence quote — focus on work, not noise art',
   'Grind in Silence Poster India | Motivational Art | ChitraFrame',
   'Grind in Silence typographic poster. Motivational wall art India. ₹499+. Ships across India.',
   ARRAY['grind','silence','hustle','motivational','motivational wall art india'], false, 2)

) AS p(slug, name, cat, desc, short_desc, seo_title, seo_desc, tags, featured, ord)
ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  description       = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  seo_title         = EXCLUDED.seo_title,
  seo_description   = EXCLUDED.seo_description,
  tags              = EXCLUDED.tags,
  is_featured       = EXCLUDED.is_featured,
  display_order     = EXCLUDED.display_order;

-- ============================================================================
-- SECTION 9: PRODUCT VARIANTS (51 × 8 combos = 408 variants)
-- Sizes: small | medium | large | xl
-- Frame types: framed | poster
-- ============================================================================

INSERT INTO product_variants (product_id, size, frame_type, price, compare_price, sku, stock_qty, is_active)
SELECT
  p.id,
  v.size,
  v.frame_type,
  v.price,
  v.compare_price,
  UPPER(REPLACE(p.slug, '-', '_')) || '_' || UPPER(v.size) || '_' || UPPER(v.frame_type) AS sku,
  50 AS stock_qty,
  true AS is_active
FROM products p
CROSS JOIN (VALUES
  ('small',  'Black', 499,  699),
  ('small',  'Natural Wood', 399,  599),
  ('medium', 'Black', 799,  1099),
  ('medium', 'Natural Wood', 699,  999),
  ('large',  'Black', 1149, 1499),
  ('large',  'Natural Wood', 999,  1299),
  ('xl',     'Black', 1749, 2299),
  ('xl',     'Natural Wood', 1499, 1999)
) AS v(size, frame_type, price, compare_price)
WHERE p.slug IN (
  'mahadev-cosmic-trance','mahadev-galaxy-medit','mahadev-neon-dark','mahadev-adiyogi-blue',
  'hanuman-bhakti-fire','hanuman-warrior-peak','hanuman-devotion-art',
  'ganesh-purple-cosmos','ganesh-gold-mandala','ganesh-sacred-geometry',
  'radha-krishna-watercolor','radha-krishna-teal-gold','radha-krishna-devotion',
  'ram-darbar-classic','ram-darbar-royal','sita-ram-watercolor','sita-ram-devotional',
  'krishna-mahabharata-1','krishna-mahabharata-2',
  'cr7-golden-era','cr7-celebration','cr7-siuu-moment',
  'messi-world-cup-glory','messi-goat-art','messi-magic-moment',
  '911-neon-tokyo','911-mountain-drive','911-sunset-turbo',
  'm4-dark-carbon','m4-racing-storm','m4-stealth-grey',
  'f1-redbull-sparks','f1-speed-art','f1-race-day',
  'superbike-collection','superbike-neon-rider','superbike-track-beast',
  'lambo-midnight-neon','goku-ultra-instinct','naruto-sage-mode','luffy-pirate-king',
  'woman-line-art-gold','beach-sunset-oil',
  'lion-geometric-gold','lion-dark-majestic','lion-warrior-spirit',
  'wolf-moonlight','wolf-forest-spirit','wolf-alpha-dark',
  'discipline-equals-freedom','grind-in-silence'
)
ON CONFLICT (sku) DO UPDATE SET
  price         = EXCLUDED.price,
  compare_price = EXCLUDED.compare_price,
  is_active     = EXCLUDED.is_active;

-- ============================================================================
-- SECTION 10: PRODUCT IMAGES (51 records — Cloudinary CDN URLs)
-- ============================================================================
-- URL pattern:
--   Full:      https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_1200/chitraframe/products/{category}/{slug}.jpg
--   Thumbnail: https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/{category}/{slug}.jpg
-- ============================================================================

INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, is_primary, display_order)
SELECT
  p.id,
  'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_1200/chitraframe/products/' || c.slug || '/' || p.slug || '.jpg',
  'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/' || c.slug || '/' || p.slug || '.jpg',
  p.name || ' — Premium Framed Wall Art Print | ChitraFrame India',
  true,
  1
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.slug IN (
  'mahadev-cosmic-trance','mahadev-galaxy-medit','mahadev-neon-dark','mahadev-adiyogi-blue',
  'hanuman-bhakti-fire','hanuman-warrior-peak','hanuman-devotion-art',
  'ganesh-purple-cosmos','ganesh-gold-mandala','ganesh-sacred-geometry',
  'radha-krishna-watercolor','radha-krishna-teal-gold','radha-krishna-devotion',
  'ram-darbar-classic','ram-darbar-royal','sita-ram-watercolor','sita-ram-devotional',
  'krishna-mahabharata-1','krishna-mahabharata-2',
  'cr7-golden-era','cr7-celebration','cr7-siuu-moment',
  'messi-world-cup-glory','messi-goat-art','messi-magic-moment',
  '911-neon-tokyo','911-mountain-drive','911-sunset-turbo',
  'm4-dark-carbon','m4-racing-storm','m4-stealth-grey',
  'f1-redbull-sparks','f1-speed-art','f1-race-day',
  'superbike-collection','superbike-neon-rider','superbike-track-beast',
  'lambo-midnight-neon','goku-ultra-instinct','naruto-sage-mode','luffy-pirate-king',
  'woman-line-art-gold','beach-sunset-oil',
  'lion-geometric-gold','lion-dark-majestic','lion-warrior-spirit',
  'wolf-moonlight','wolf-forest-spirit','wolf-alpha-dark',
  'discipline-equals-freedom','grind-in-silence'
)
ON CONFLICT (product_id, is_primary) WHERE is_primary = true DO UPDATE SET
  image_url     = EXCLUDED.image_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  alt_text      = EXCLUDED.alt_text;

-- ── 10 FEATURED DESIGNS — explicit Cloudinary URLs (uploaded from genspark.ai originals) ──
-- These 10 are the primary/hero products shown on homepage and in ads.
-- Uploaded path: chitraframe/products/{category}/{slug}
DO $$
DECLARE
  _pid UUID;
BEGIN
  -- 1. Mahadev Cosmic Meditation (slug: mahadev-cosmic-trance)
  SELECT id INTO _pid FROM products WHERE slug = 'mahadev-cosmic-trance';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/spiritual/mahadev-cosmic-trance.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/spiritual/mahadev-cosmic-trance.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 2. Radha Krishna Watercolor (slug: radha-krishna-watercolor)
  SELECT id INTO _pid FROM products WHERE slug = 'radha-krishna-watercolor';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/spiritual/radha-krishna-watercolor.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/spiritual/radha-krishna-watercolor.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 3. Radha Krishna Emerald Dance (slug: radha-krishna-devotion used as proxy until slug added)
  -- Note: 'radha-krishna-emerald-dance' is in DESIGN_IMAGES but not yet in DB products list
  -- Adding it as a separate product:
  INSERT INTO products (slug, name, category_id, description, short_description, seo_title, seo_description, tags, is_active, is_featured, display_order)
  SELECT
    'radha-krishna-emerald-dance',
    'Radha Krishna Emerald Dance',
    (SELECT id FROM categories WHERE slug = 'spiritual'),
    'Radha and Krishna in an intimate emerald-toned dance, swirling greens and gold creating an aura of divine love and eternal union.',
    'Radha Krishna in emerald & gold divine dance',
    'Radha Krishna Emerald Dance Poster | Krishna Wall Art India | ChitraFrame',
    'Radha Krishna Emerald Dance — emerald & gold framed art. ₹499+. Ships across India.',
    ARRAY['radha krishna','emerald','dance','divine love','krishna art india'],
    true, true, 20
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO _pid FROM products WHERE slug = 'radha-krishna-emerald-dance';
  IF _pid IS NOT NULL THEN
    INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, is_primary, display_order)
    VALUES (
      _pid,
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/spiritual/radha-krishna-emerald-dance.jpg',
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/spiritual/radha-krishna-emerald-dance.jpg',
      'Radha Krishna Emerald Dance — Premium Framed Wall Art Print | ChitraFrame India',
      true, 1
    ) ON CONFLICT (product_id, is_primary) WHERE is_primary = true DO UPDATE SET
      image_url     = EXCLUDED.image_url,
      thumbnail_url = EXCLUDED.thumbnail_url;
  END IF;

  -- 4. BMW M4 Carbon Dark
  SELECT id INTO _pid FROM products WHERE slug = 'm4-dark-carbon';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/automotive/bmw-m4-carbon-dark.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/automotive/bmw-m4-carbon-dark.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 5. Porsche 911 Pacific Coast (slug: 911-mountain-drive as closest match)
  SELECT id INTO _pid FROM products WHERE slug = '911-mountain-drive';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/automotive/porsche-911-pacific-coast.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/automotive/porsche-911-pacific-coast.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 6. Lamborghini Aventador Neon
  SELECT id INTO _pid FROM products WHERE slug = 'lambo-midnight-neon';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/legend/lamborghini-aventador-neon.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/legend/lamborghini-aventador-neon.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 7. Nissan GT-R R34 Osaka Rain (new product)
  INSERT INTO products (slug, name, category_id, description, short_description, seo_title, seo_description, tags, is_active, is_featured, display_order)
  SELECT
    'nissan-gtr-r34-osaka-rain',
    'Nissan GT-R R34 Osaka Rain',
    (SELECT id FROM categories WHERE slug = 'automotive'),
    'The legendary Nissan Skyline GT-R R34 cutting through rain-slicked Osaka streets at night — neon reflections, cinematic drama, pure JDM soul.',
    'Nissan R34 GT-R in Osaka rain — legendary JDM art',
    'Nissan GT-R R34 Osaka Rain Poster | JDM Wall Art India | ChitraFrame',
    'Nissan GT-R R34 Osaka Rain — legendary JDM car art print. ₹499+. Ships pan-India.',
    ARRAY['nissan','gtr','r34','JDM','osaka','night rain','car art india'],
    true, true, 13
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO _pid FROM products WHERE slug = 'nissan-gtr-r34-osaka-rain';
  IF _pid IS NOT NULL THEN
    INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, is_primary, display_order)
    VALUES (
      _pid,
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/automotive/nissan-gtr-r34-osaka-rain.jpg',
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/automotive/nissan-gtr-r34-osaka-rain.jpg',
      'Nissan GT-R R34 Osaka Rain — Premium Framed Wall Art Print | ChitraFrame India',
      true, 1
    ) ON CONFLICT (product_id, is_primary) WHERE is_primary = true DO UPDATE SET
      image_url     = EXCLUDED.image_url,
      thumbnail_url = EXCLUDED.thumbnail_url;
  END IF;

  -- 8. F1 Red Bull Racing
  SELECT id INTO _pid FROM products WHERE slug = 'f1-redbull-sparks';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/automotive/f1-redbull-racing.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/automotive/f1-redbull-racing.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

  -- 9. Cricket Glory Moment (new product)
  INSERT INTO products (slug, name, category_id, description, short_description, seo_title, seo_description, tags, is_active, is_featured, display_order)
  SELECT
    'cricket-glory-moment',
    'Cricket Glory Moment',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'The electric moment of cricketing triumph — bat raised, crowd roaring, stadium ablaze with light. A celebration of India''s cricket passion.',
    'Cricketing glory moment — triumph, bat raised, stadium lights',
    'Cricket Glory Moment Poster | Cricket Wall Art India | ChitraFrame',
    'Cricket Glory Moment — premium framed cricket art. ₹499+. Ships pan-India.',
    ARRAY['cricket','glory','sports','stadium','cricket poster india'],
    true, true, 7
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO _pid FROM products WHERE slug = 'cricket-glory-moment';
  IF _pid IS NOT NULL THEN
    INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, is_primary, display_order)
    VALUES (
      _pid,
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/sports/cricket-glory-moment.jpg',
      'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/sports/cricket-glory-moment.jpg',
      'Cricket Glory Moment — Premium Framed Wall Art Print | ChitraFrame India',
      true, 1
    ) ON CONFLICT (product_id, is_primary) WHERE is_primary = true DO UPDATE SET
      image_url     = EXCLUDED.image_url,
      thumbnail_url = EXCLUDED.thumbnail_url;
  END IF;

  -- 10. Lion Geometric Gold
  SELECT id INTO _pid FROM products WHERE slug = 'lion-geometric-gold';
  IF _pid IS NOT NULL THEN
    UPDATE product_images SET
      image_url     = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/wildlife/lion-geometric-gold.jpg',
      thumbnail_url = 'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/wildlife/lion-geometric-gold.jpg'
    WHERE product_id = _pid AND is_primary = true;
  END IF;

END $$;

-- ── Variants for new products (cricket, nissan, radha-krishna-emerald-dance) ──
INSERT INTO product_variants (product_id, size, frame_type, price, compare_price, sku, stock_qty, is_active)
SELECT
  p.id, v.size, v.frame_type, v.price, v.compare_price,
  UPPER(REPLACE(p.slug, '-', '_')) || '_' || UPPER(v.size) || '_' || UPPER(v.frame_type),
  50, true
FROM products p
CROSS JOIN (VALUES
  ('small',  'Black', 499,  699),
  ('small',  'Natural Wood', 399,  599),
  ('medium', 'Black', 799,  1099),
  ('medium', 'Natural Wood', 699,  999),
  ('large',  'Black', 1149, 1499),
  ('large',  'Natural Wood', 999,  1299),
  ('xl',     'Black', 1749, 2299),
  ('xl',     'Natural Wood', 1499, 1999)
) AS v(size, frame_type, price, compare_price)
WHERE p.slug IN ('cricket-glory-moment','nissan-gtr-r34-osaka-rain','radha-krishna-emerald-dance')
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- SECTION 11: DEFAULT FAQ
-- ============================================================================

INSERT INTO faq (question, answer, display_order) VALUES
  ('Will my frame break during delivery?',  'No. We use 5-layer protective packaging with corner protectors. If it arrives damaged, film your unboxing and we replace it free — no questions asked.', 1),
  ('How long does delivery take?',          '3–5 business days across India. 1–3 days in Hyderabad (500xxx pincodes).', 2),
  ('Is COD available?',                     'Currently we accept prepaid payments only (UPI, cards, net banking). COD will be enabled soon. Enjoy ₹50 off on all prepaid orders!', 3),
  ('What is your return/refund policy?',    'Damaged items are replaced free — unboxing video required. Custom frames are non-returnable. See our Returns page for full details.', 4),
  ('Can I cancel my order?',                'Yes, within 24 hours if not yet dispatched. After dispatch, cancellations are not possible.', 5),
  ('Do you do custom photo frames?',        'Yes! Upload your photo on our Custom Frames page. Minimum resolution 1500×2000px. Custom frames are prepaid only and non-returnable.', 6),
  ('What payment methods do you accept?',   'All UPI apps (GPay, PhonePe, Paytm), credit/debit cards, and net banking. Powered by Razorpay — 100% secure checkout.', 7),
  ('How do I track my order?',              'Visit our Track page and enter your Order ID (CF-XXXXXX) or registered phone number. You will also receive tracking updates via email.', 8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 12: STATIC PAGES (ChitraFrame branded)
-- ============================================================================

INSERT INTO pages (slug, title, content) VALUES
  ('returns', 'Returns & Refund Policy',
   '<h2>Returns & Refund Policy</h2><p>At ChitraFrame, we want you to be completely happy with your purchase.</p><h3>Damage Claims</h3><p>If your order arrives damaged, we will replace it free. <strong>An unboxing video is mandatory</strong> for all damage claims.</p><h3>Custom Frames</h3><p><strong>Custom frame orders are final — no returns or cancellations.</strong></p><h3>Cancellations</h3><p>Orders can be cancelled within 24 hours of placing if not yet dispatched.</p><h3>Refund Timeline</h3><ul><li>Prepaid, not dispatched, within 24h: 5–7 business days</li><li>Damaged with video: Free replacement in 3–5 days</li></ul>'),
  ('terms', 'Terms & Conditions',
   '<h2>Terms & Conditions</h2><p>By using ChitraFrame, you agree to these terms.</p><h3>Orders</h3><p>All orders are made-to-order. Delivery timeline is 3–5 business days.</p><h3>Payments</h3><p>We accept all UPI apps, credit/debit cards and net banking via Razorpay secure checkout.</p>'),
  ('shipping', 'Shipping Policy',
   '<h2>Shipping Policy</h2><p>We dispatch orders within 12 hours of confirmation.</p><h3>Delivery</h3><ul><li>Hyderabad (500xxx): 1–3 business days</li><li>Rest of India: 3–5 business days</li></ul><h3>Charges</h3><ul><li>Orders above ₹899: FREE shipping</li><li>Orders below ₹899: ₹99 shipping</li></ul>'),
  ('privacy', 'Privacy Policy',
   '<h2>Privacy Policy</h2><p>ChitraFrame collects only essential information to process orders. We never sell your data. Payments are processed securely by Razorpay.</p>'),
  ('about', 'About ChitraFrame',
   '<h2>About ChitraFrame</h2><p>ChitraFrame is your destination for premium framed wall art. We curate spiritual, automotive, sports, wildlife and motivational art printed on 300gsm museum-grade paper in solid wood frames. Fast delivery across India from Hyderabad.</p><p>Every frame is manually inspected before dispatch. Our 5-layer protective packaging ensures your art arrives in perfect condition.</p>')
ON CONFLICT (slug) DO UPDATE SET
  title   = EXCLUDED.title,
  content = EXCLUDED.content;

-- ============================================================================
-- SECTION 13: COMBO DEALS
-- ============================================================================

INSERT INTO combos (name, slug, description, items, original_price, combo_price,
                    savings_percent, display_order, category, is_active) VALUES
  ('Spiritual Art Trio',        'spiritual-art-trio',       '3 divine frames — curated for your puja room or sacred space',
   '{"count": 3, "size": "small", "frame": "framed", "category": "spiritual"}',  1497, 1299, 13, 1, 'spiritual', true),
  ('Automotive Dream Duo',      'automotive-dream-duo',     '2 premium automotive prints — your garage, elevated',
   '{"count": 2, "size": "medium", "frame": "framed", "category": "automotive"}', 1598, 1399, 12, 2, 'automotive', true),
  ('Bedroom Gallery Kit',       'bedroom-gallery-kit',      '3 small framed prints for a cohesive bedroom vibe',
   '{"count": 3, "size": "small", "frame": "framed"}',                            1497, 1199, 20, 3, 'general',    true),
  ('Focus Mode Workspace Set',  'focus-mode-workspace',     '3 motivational prints — minimal, powerful, focused',
   '{"count": 3, "size": "small", "frame": "framed", "category": "motivational"}', 1497, 1199, 20, 4, 'general',   true),
  ('Premium Gift Frame',        'premium-gift-frame',       '1 Medium framed print — premium gift',
   '{"count": 1, "size": "medium", "frame": "framed"}',                           799,  699,  12, 5, 'general',    true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 14: SEO BLOG POSTS (ChitraFrame branded)
-- ============================================================================

INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, is_published, author, meta_title, meta_description) VALUES

('Best Spiritual Wall Art for Indian Homes 2026 — Mahadev, Ganesha, Hanuman, Krishna',
 'best-spiritual-wall-art-indian-homes-2026',
 'Transform your home with divine framed art. Discover the best Mahadev, Ganesha, Hanuman and Krishna wall art prints for Indian homes in 2026.',
 '<h2>Spiritual Wall Art for Every Indian Home</h2><p>Divine art has always been at the heart of Indian homes. A beautifully framed spiritual artwork elevates your space — aesthetically and spiritually. At ChitraFrame, our spiritual collection features museum-quality prints in solid wood frames, starting at ₹499.</p><h3>Most Popular Designs</h3><h4>Mahadev / Lord Shiva</h4><p>Our Mahadev Cosmic Trance is a bestseller — Lord Shiva in deep meditation surrounded by galaxies and golden light. Perfect for meditation rooms, living rooms, and home mandirs.</p><h4>Lord Ganesha</h4><p>The remover of obstacles, at the entrance or in your study. Our Ganesh Purple Cosmos and Ganesh Gold Mandala designs are both stunning choices.</p><h4>Hanuman</h4><p>Hanuman art invokes courage and protection. Our Hanuman Bhakti Fire brings warmth and devotion to any space.</p><h4>Radha Krishna</h4><p>The divine love of Radha and Krishna. Our watercolour and teal & gold interpretations are popular wedding and anniversary gifts.</p><h2>Buy Spiritual Art Frames Online India</h2><p>All ChitraFrame spiritual prints come in 4 sizes (Small 8×12" to XL 24×36"). Free shipping on orders ₹899+. Ships pan-India.</p>',
 'spiritual', ARRAY['spiritual wall art india','mahadev poster','ganesha frame','hanuman art','krishna poster india'], true, 'ChitraFrame',
 'Best Spiritual Wall Art for Indian Homes 2026 | ChitraFrame',
 'Buy best spiritual wall art for Indian homes — Mahadev, Ganesha, Hanuman, Krishna framed art. Premium quality from ₹499. Free delivery above ₹899.'),

('Automotive Wall Art for Man Cave & Home Office — Porsche, BMW, F1 India',
 'automotive-wall-art-man-cave-home-office-india',
 'Turn your love for cars into stunning wall art. Premium automotive poster frames — Porsche 911, BMW M4, Formula 1 — for your man cave, garage or office.',
 '<h2>Automotive Art Frames — For Car Enthusiasts</h2><p>Your passion deserves to be on your wall. ChitraFrame''s automotive collection features cinematic car art in premium solid wood frames — perfect for man caves, home offices, and gaming setups.</p><h3>Featured Automotive Designs</h3><h4>Porsche 911 Series</h4><p>The most iconic sports car, captured in three stunning artworks — Neon Tokyo Night, Mountain Drive, and Sunset Turbo.</p><h4>BMW M4 Series</h4><p>The dark carbon edition, racing storm, and stealth grey — three faces of Bavaria''s finest.</p><h4>Formula 1</h4><p>Red Bull sparks on a night circuit, pure speed art, and race day glory — F1 energy on your wall.</p><h4>SuperBikes</h4><p>Triple Crown collection, Neon Rider, and Track Beast — for two-wheel enthusiasts.</p><h2>Order Automotive Art India</h2><p>Starting ₹499. Free shipping ₹899+. Ships pan-India in 3–5 days.</p>',
 'automotive', ARRAY['automotive wall art india','car poster frame','BMW M4 poster','Porsche frame India','F1 art india'], true, 'ChitraFrame',
 'Automotive Wall Art — Porsche, BMW M4, F1 Framed Art India | ChitraFrame',
 'Buy premium automotive wall art frames in India — Porsche 911, BMW M4, Formula 1. Man cave, office, garage art from ₹499. Free delivery ₹899+.'),

('How to Choose the Perfect Photo Frame Size for Your Home',
 'choose-perfect-photo-frame-size-india',
 'Small 8x12 to XL 24x36 — everything you need to know about choosing the right frame size for every room in your home.',
 '<h2>Choosing the Right Frame Size</h2><p>One of the most common questions at ChitraFrame is: "Which size should I order?" Here''s our complete guide.</p><h3>Small (8×12" / 20×30 cm) — ₹499</h3><p>Perfect for desks, shelves, and bedside tables. Great for intimate displays and gifts.</p><h3>Medium (12×18" / 30×45 cm) — ₹799</h3><p>Our bestseller. Works perfectly above beds, on home office walls. The ideal gift size.</p><h3>Large (18×24" / 45×60 cm) — ₹1,149</h3><p>Statement pieces for living rooms and dining areas. Creates a focal point on feature walls.</p><h3>XL (24×36" / 60×90 cm) — ₹1,749</h3><p>Feature wall hero. Maximum visual impact for open-plan living areas and commercial spaces.</p><h2>Gallery Wall Tip</h2><p>Mix a Large centerpiece with two Small frames for a professional gallery wall — total under ₹2,500.</p>',
 'buying-guide', ARRAY['photo frame sizes India','frame size guide','wall art sizes','small medium large xl frame'], true, 'ChitraFrame',
 'How to Choose Photo Frame Size — Complete Guide India 2026 | ChitraFrame',
 'Not sure which photo frame size? Small 8x12 to XL 24x36 — our complete size guide for every room. Buy frames from ₹499 with free delivery.'),

('10 Creative Ways to Display Photo Frames on Your Wall',
 'creative-photo-frame-display-ideas-india',
 'Move beyond single frames! Discover gallery walls, symmetrical grids, staircase arrangements and more creative ways to display frames.',
 '<h2>10 Creative Wall Display Ideas</h2><h3>1. The Gallery Wall Cluster</h3><p>Mix 5–9 frames of different sizes in a loose cluster. Start from the center.</p><h3>2. Symmetrical Grid</h3><p>6 or 9 matching frames in a perfect grid — modern, minimalist, stunning.</p><h3>3. Staircase Arrangement</h3><p>Follow the diagonal line of your staircase. Creates dramatic visual flow.</p><h3>4. Single Statement Frame</h3><p>One XL (24×36) centered above a sofa or bed. Maximum impact.</p><h3>5. The Bedroom Headboard</h3><p>3–5 frames arranged horizontally above the bed.</p><h3>6. Pooja Room Arrangement</h3><p>Ganesha at center, Shiva and Hanuman flanking — spiritually balanced and visually stunning.</p><h3>7. Office Motivation Wall</h3><p>5 motivational quote frames for your work-from-home setup.</p><h3>8. The Triptych</h3><p>Three frames side-by-side — a themed collection or split image.</p><h3>9. Floating Shelves + Frames</h3><p>Mix frames with plants and books for a layered, curated look.</p><h3>10. Sports Fan Corner</h3><p>CR7, Messi, or your team — dedicated sports art wall.</p>',
 'decor-ideas', ARRAY['photo frame display ideas','gallery wall India','wall decor ideas','frame arrangement tips'], true, 'ChitraFrame',
 '10 Creative Ways to Display Photo Frames | ChitraFrame',
 'Transform your walls with creative photo frame display ideas — gallery walls, grids, staircase arrangements. Buy frames from ₹499.'),

('Why Custom Photo Frames Make the Best Personalised Gifts in India',
 'custom-photo-frames-personalised-gifts-india',
 'Looking for a unique, heartfelt gift? Custom photo frames stand out from generic gifts — here is why.',
 '<h2>The Gift That Never Goes Out of Style</h2><p>A custom framed photograph is personal, meaningful, and becomes a lasting keepsake displayed for years.</p><h3>Perfect Occasions</h3><ul><li><strong>Weddings:</strong> A framed couple portrait displayed for decades</li><li><strong>Birthdays:</strong> Upload a favourite memory, frame it professionally</li><li><strong>Housewarming:</strong> Divine art blesses the new home</li><li><strong>Anniversaries:</strong> A meaningful photo in a premium frame</li></ul><h3>ChitraFrame Quality</h3><ul><li>300gsm museum-grade fine art paper — colours stay vivid for 75+ years</li><li>Solid hardwood frames — no plastic, no warping</li><li>Every custom design manually verified before printing</li></ul><h3>How to Order</h3><ol><li>Visit Custom Frames on chitraframe.in</li><li>Upload your photo (min 1500×2000px)</li><li>Choose size and frame style</li><li>Delivered pan-India in 3–5 days</li></ol>',
 'gifting', ARRAY['custom photo frame gift India','personalised frame gift','photo frame gift','unique gifts India 2026'], true, 'ChitraFrame',
 'Custom Photo Frames — Best Personalised Gifts in India | ChitraFrame',
 'Custom photo frames make the best personalised gifts for weddings, birthdays, anniversaries in India. Premium quality from ₹499. Free delivery ₹899+.')

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 15: FRAME TYPE CONSTRAINT FIX
-- ============================================================================

-- Drop old enum-style check constraints if they exist
DO $$
BEGIN
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

-- ============================================================================
-- SECTION 16: WRANGLER SECRETS REFERENCE
-- ============================================================================
-- Set these in Cloudflare Dashboard → Workers & Pages → chitraframe → Settings → Variables:
-- Or via CLI: npx wrangler secret put SECRET_NAME --project-name chitraframe
--
-- Required secrets:
--   SUPABASE_URL          — your Supabase project URL
--   SUPABASE_SERVICE_KEY  — Supabase service role key (from Settings → API)
--   SUPABASE_ANON_KEY     — Supabase anon/public key
--   ADMIN_TOKEN           — random secure string for admin session tokens
--   ADMIN_PASSWORD        — password for admin@chitraframe.in login
--   OWNER_EMAIL           — admin@chitraframe.in
--   ALERT_EMAIL           — your personal email for order alerts
--   RAZORPAY_KEY_ID       — Razorpay API key ID
--   RAZORPAY_KEY_SECRET   — Razorpay API key secret
--   CLOUDINARY_CLOUD_NAME — dax4yqumu
--   CLOUDINARY_API_KEY    — from Cloudinary console
--   CLOUDINARY_API_SECRET — from Cloudinary console
--   CLOUDINARY_URL        — cloudinary://API_KEY:API_SECRET@dax4yqumu
--   BREVO_API_KEY         — Brevo transactional email key
--   SHIPROCKET_EMAIL      — Shiprocket login email
--   SHIPROCKET_PASSWORD   — Shiprocket login password
--   OPENROUTER_API_KEY    — for AI product descriptions

-- ============================================================================
-- SECTION 17: VERIFICATION QUERIES
-- ============================================================================
-- Run these after executing to verify everything is correct:
--
-- SELECT COUNT(*) FROM products;                                    -- 54+
-- SELECT COUNT(*) FROM product_variants;                           -- 408+
-- SELECT COUNT(*) FROM product_images;                             -- 54+
-- SELECT COUNT(*) FROM categories;                                 -- 20+
-- SELECT slug, name FROM categories WHERE is_intent_collection = false ORDER BY display_order;
-- SELECT p.slug, c.slug AS category, pi.image_url
--   FROM products p
--   JOIN categories c ON p.category_id = c.id
--   JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
--   WHERE p.is_featured = true ORDER BY c.display_order, p.display_order;
-- SELECT key, value FROM system_config WHERE key IN ('brand_name','cod_enabled','free_shipping_threshold');
-- SELECT key, value FROM site_config WHERE key IN ('brand_name','seo_title');

-- ============================================================================
-- END OF ChitraFrame Unified SQL v5.0
-- Safe to re-run at any time — all statements are fully idempotent.
-- Brand: ChitraFrame | chitraframe.in | Cloudinary: dax4yqumu
-- ============================================================================
