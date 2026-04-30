-- ============================================================================
-- PhotoFrameIn — MASTER DATABASE SCRIPT
-- Version: 3.0 | Run once in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================================
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file → Run
--   3. Done. All tables, indexes, RLS policies, functions, seed data created.
-- ============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- ─── SYSTEM CONFIG (key-value store for all app settings) ───────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  description          TEXT,
  image_url            TEXT,
  display_order        INTEGER DEFAULT 0,
  hover_color          TEXT DEFAULT '#7C3AED',
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
  care_details              TEXT,
  size_guide                TEXT,
  category_id               UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags                      TEXT[] DEFAULT '{}',
  is_active                 BOOLEAN DEFAULT TRUE,
  is_placeholder            BOOLEAN DEFAULT FALSE,
  is_custom_frame           BOOLEAN DEFAULT FALSE,
  is_hidden                 BOOLEAN DEFAULT FALSE,
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
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCT IMAGES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  alt_text      TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCT VARIANTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size               TEXT NOT NULL CHECK (size IN ('A4', 'Small', 'Medium', 'Large', 'XL')),
  frame_type         TEXT NOT NULL CHECK (frame_type IN ('No Frame', 'Standard', 'Premium')),
  price              INTEGER NOT NULL,
  compare_at_price   INTEGER,
  sku                TEXT UNIQUE,
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

-- ─── ORDER SEQUENCE (PS-YYMMDD-XXXX format) ─────────────────────────────────
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
  type                 TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value                INTEGER NOT NULL,
  min_subtotal         INTEGER DEFAULT 0,
  max_discount         INTEGER,
  expiry_date          TIMESTAMPTZ,
  total_limit          INTEGER,
  per_user_limit       INTEGER DEFAULT 1,
  usage_count          INTEGER DEFAULT 0,
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
  image_urls        TEXT[],
  video_url         TEXT,
  is_approved       BOOLEAN DEFAULT FALSE,
  is_featured       BOOLEAN DEFAULT FALSE,
  is_hidden         BOOLEAN DEFAULT FALSE,
  admin_reply       TEXT,
  helpful_count     INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  source            TEXT DEFAULT 'website',  -- 'website', 'google', 'instagram', 'imported'
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMBOS / BUNDLES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  image_url      TEXT,
  badge_text     TEXT,
  items          JSONB NOT NULL,
  original_price INTEGER NOT NULL,
  combo_price    INTEGER NOT NULL,
  savings_percent INTEGER DEFAULT 0,
  display_order  INTEGER DEFAULT 0,
  category       TEXT DEFAULT 'general',
  is_active      BOOLEAN DEFAULT TRUE,
  is_featured    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMBO PRODUCTS (junction — which specific products/variants are in combo) ─
CREATE TABLE IF NOT EXISTS combo_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id     UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity     INTEGER DEFAULT 1,
  display_name TEXT,
  display_image TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
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
  category        TEXT,
  tags            TEXT[],
  is_published    BOOLEAN DEFAULT FALSE,
  product_links   UUID[],
  author          TEXT DEFAULT 'PhotoFrameIn',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAGES (policies, about, contact) ────────────────────────────────────────
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

-- ─── PAGE VERSIONS (history) ─────────────────────────────────────────────────
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

-- ─── PINCODE RISK (RTO tracking) ─────────────────────────────────────────────
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

-- ─── EMAIL FAILURES (for retry queue) ────────────────────────────────────────
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

-- ─── LEADS (exit intent, newsletters) ────────────────────────────────────────
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
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AD PERFORMANCE TRACKING ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_performance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  platform    TEXT NOT NULL,       -- 'instagram', 'google', 'facebook', 'organic'
  campaign    TEXT,
  category    TEXT,                -- 'divine', 'automotive', 'general'
  ad_spend    INTEGER DEFAULT 0,   -- in paise (₹1 = 100 paise)
  impressions INTEGER DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  orders      INTEGER DEFAULT 0,
  revenue     INTEGER DEFAULT 0,
  cac         INTEGER DEFAULT 0,   -- cost per acquisition in ₹
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

-- ============================================================================
-- SECTION 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug       ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_hidden     ON products(is_hidden);
CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product      ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_id     ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment      ON orders(payment_method);
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

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;

-- Customers see only their own data
DROP POLICY IF EXISTS "customers_own_data"    ON customers;
DROP POLICY IF EXISTS "customers_update_own"  ON customers;
DROP POLICY IF EXISTS "addresses_own_data"    ON customer_addresses;
DROP POLICY IF EXISTS "orders_own_data"       ON orders;
DROP POLICY IF EXISTS "wishlists_own_data"    ON wishlists;
DROP POLICY IF EXISTS "admins_read_self"      ON admin_users;

CREATE POLICY "customers_own_data"   ON customers          FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "customers_update_own" ON customers          FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "addresses_own_data"   ON customer_addresses FOR ALL    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "orders_own_data"      ON orders             FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "wishlists_own_data"   ON wishlists          FOR ALL    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));
CREATE POLICY "admins_read_self"     ON admin_users        FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Public read tables
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq             ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read"  ON products;
DROP POLICY IF EXISTS "variants_public_read"  ON product_variants;
DROP POLICY IF EXISTS "images_public_read"    ON product_images;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "reviews_public_read"   ON reviews;
DROP POLICY IF EXISTS "blog_public_read"      ON blog_posts;
DROP POLICY IF EXISTS "pages_public_read"     ON pages;
DROP POLICY IF EXISTS "faq_public_read"       ON faq;
DROP POLICY IF EXISTS "combos_public_read"    ON combos;

CREATE POLICY "products_public_read"   ON products         FOR SELECT USING (is_active = TRUE);
CREATE POLICY "variants_public_read"   ON product_variants FOR SELECT USING (TRUE);
CREATE POLICY "images_public_read"     ON product_images   FOR SELECT USING (TRUE);
CREATE POLICY "categories_public_read" ON categories       FOR SELECT USING (is_active = TRUE);
CREATE POLICY "reviews_public_read"    ON reviews          FOR SELECT USING (is_approved = TRUE AND is_hidden = FALSE);
CREATE POLICY "blog_public_read"       ON blog_posts       FOR SELECT USING (is_published = TRUE);
CREATE POLICY "pages_public_read"      ON pages            FOR SELECT USING (TRUE);
CREATE POLICY "faq_public_read"        ON faq              FOR SELECT USING (is_active = TRUE);
CREATE POLICY "combos_public_read"     ON combos           FOR SELECT USING (is_active = TRUE);

-- ============================================================================
-- SECTION 4: FUNCTIONS
-- ============================================================================

-- Atomic order sequence increment (PS-YYMMDD-XXXX)
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

-- Increment customer stats when an order is placed
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

-- ============================================================================
-- SECTION 5: SYSTEM CONFIG DEFAULTS
-- (ON CONFLICT DO NOTHING — safe to re-run, won't overwrite your live values)
-- ============================================================================

INSERT INTO system_config (key, value, description) VALUES
  -- ── Checkout & Payments ──────────────────────────────────────────────────
  ('checkout_mode',              'custom',       'Primary checkout: custom or shiprocket'),
  ('cod_enabled',                'true',         'Global COD toggle'),
  ('cod_min_value',              '499',          'Minimum order value for COD (₹)'),
  ('cod_max_value',              '1995',         'Maximum order value for COD (₹)'),
  ('cod_fee',                    '49',           'COD confirmation fee (₹)'),
  ('free_shipping_threshold',    '799',          'Free shipping above this amount for prepaid (₹)'),
  ('prepaid_discount',           '50',           'Flat discount for prepaid orders (₹)'),
  ('premium_frame_surcharge',    '250',          'Extra charge for Premium frame type (₹)'),
  -- ── Volume Discounts ─────────────────────────────────────────────────────
  ('volume_discount_2',          '100',          'Discount for 2 items (₹)'),
  ('volume_discount_3',          '250',          'Discount for 3 items (₹)'),
  ('volume_discount_5_pct',      '20',           'Discount % for 5+ items'),
  -- ── Operations ───────────────────────────────────────────────────────────
  ('pickup_pincode',             '501504',       'Warehouse pickup pincode'),
  ('acrylic_enabled',            'true',         'Acrylic upgrade option toggle'),
  ('combos_enabled',             'true',         'Global combos/bundles toggle'),
  ('exit_intent_enabled',        'true',         'Exit intent popup toggle'),
  ('a4_oos_threshold',           '10',           'Auto OOS if A4 exceeds % of daily orders'),
  -- ── Shipping ─────────────────────────────────────────────────────────────
  ('shipping_prepaid_below_floor', '79',         'Shipping for prepaid below free threshold (₹)'),
  ('shipping_cod_small_medium',  '99',           'Shipping for COD Small/Medium (₹)'),
  ('shipping_cod_large_xl',      '149',          'Shipping for COD Large/XL (₹)'),
  -- ── Contact & Business Info (editable from admin Settings) ───────────────
  ('contact_email',              'support@photoframein.com', 'Customer support email (public)'),
  ('contact_phone',              '+91 79895 31818',          'Customer support phone (public)'),
  ('contact_address',            'Hyderabad, Telangana, India', 'Store address (public)'),
  ('whatsapp_number',            '917989531818', 'WhatsApp number (with country code, no +)'),
  ('whatsapp_link',              '',             'WhatsApp Business link (overrides number if set)'),
  -- ── Social Links ─────────────────────────────────────────────────────────
  ('instagram_link',             '',             'Instagram profile URL'),
  ('facebook_link',              '',             'Facebook page URL'),
  ('twitter_link',               '',             'Twitter/X profile URL'),
  ('youtube_link',               '',             'YouTube channel URL'),
  ('google_business_link',       '',             'Google Business Profile URL'),
  -- ── Announcement Bar ─────────────────────────────────────────────────────
  ('announcement_active',        'true',         'Show announcement bar'),
  ('announcement_text',          'Free Delivery on orders above ₹799 | COD Available', 'Announcement bar text'),
  ('announcement_link',          '/shop',        'Announcement bar link'),
  ('announcement_bg',            '#CC0000',      'Announcement bar background colour'),
  -- ── Urgency / CRO ────────────────────────────────────────────────────────
  ('urgency_text',               'Limited Stock Available',  'Urgency message on product pages'),
  ('urgency_subtext',            'Offer Ends Tonight',       'Urgency sub-message'),
  ('festival_mode',              '',             'Active festival: diwali, navratri, janmashtami…'),
  -- ── SEO ──────────────────────────────────────────────────────────────────
  ('seo_title',                  'PhotoFrameIn | Buy Photo Frames & Wall Art Online India', 'Homepage SEO title'),
  ('seo_description',            'Buy premium poster frames, wall art & custom photo frames online. Fast delivery across India. Starting ₹199. Free delivery ₹799+', 'Homepage SEO description'),
  ('og_image',                   '',             'Homepage OG/social share image URL'),
  -- ── Hero Banner ──────────────────────────────────────────────────────────
  ('hero_banner_title',          'Premium Photo Frames & Wall Art Online',      'Homepage hero heading'),
  ('hero_banner_subtitle',       'Transform your space. Dive Art, Automotive, Custom Frames — delivered across India.', 'Homepage hero subheading'),
  ('hero_banner_image',          '',             'Homepage hero background image URL'),
  ('hero_banner_cta_text',       'Browse Art Catalog',  'Hero CTA button text'),
  ('hero_banner_cta_link',       '/shop',        'Hero CTA button link'),
  -- ── Category Hero Titles (editable without code deploy) ──────────────────
  ('divine_hero_title',          'Sacred Art for Sacred Spaces',                'Divine category hero title'),
  ('divine_hero_subtitle',       'Ganesha, Shiva, Hanuman, Krishna, Rama — framed in pure devotion', 'Divine category hero subtitle'),
  ('automotive_hero_title',      'Speed. Elegance. Obsession.',                 'Automotive category hero title'),
  ('automotive_hero_subtitle',   'Porsche, Ferrari, Hypercars — frame the machines you love', 'Automotive category hero subtitle'),
  -- ── Analytics & Tracking ─────────────────────────────────────────────────
  ('gtm_container_id',           '',             'Google Tag Manager container ID'),
  ('maps_embed',                 '',             'Google Maps embed URL for contact page'),
  -- ── Ad Performance Benchmarks ────────────────────────────────────────────
  ('ads_budget_monthly',         '3000',         'Monthly ad budget (₹)'),
  ('cac_instagram',              '0',            'Last known CAC from Instagram Ads (₹)'),
  ('cac_google',                 '0',            'Last known CAC from Google Ads (₹)'),
  ('cvr_divine',                 '0',            'Conversion rate % for divine category'),
  ('cvr_automotive',             '0',            'Conversion rate % for automotive category'),
  -- ── Carrier Tracking URL Bases ───────────────────────────────────────────
  ('shiprocket_tracking_base',   'https://shiprocket.co/tracking/',             'Shiprocket tracking URL base'),
  ('delhivery_tracking_base',    'https://www.delhivery.com/track/package/',    'Delhivery tracking URL base'),
  ('dtdc_tracking_base',         'https://www.dtdc.in/tracking.asp?txbkp=',    'DTDC tracking URL base'),
  ('bluedart_tracking_base',     'https://www.bluedart.com/tracking',           'BlueDart tracking URL base'),
  -- ── About / Misc ─────────────────────────────────────────────────────────
  ('about_content',              'PhotoFrameIn is your destination for premium photo frames and wall art. We craft beautiful frames with the fastest turnaround in India.', 'About us text')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECTION 6: CATEGORIES SEED
-- ============================================================================

INSERT INTO categories (name, slug, description, hover_color, display_order, is_active,
                         hero_title, hero_subtitle, hero_badge) VALUES
  ('Divine',          'divine',          'Sacred art and spiritual wall decor featuring deities, mandalas, and divine energy', '#7C3AED', 1, true,
   'Sacred Art for Sacred Spaces', 'Ganesha, Shiva, Hanuman, Krishna, Rama — framed in pure devotion', '🕉️ Spiritual'),
  ('Automotive',      'automotive',      'Premium automotive art featuring supercars, classic rides, and racing legends', '#E8670A', 2, true,
   'Speed. Elegance. Obsession.', 'Porsche, Ferrari, Hypercars — frame the machines you love', '🏎️ Speed & Style'),
  ('Motivation',      'motivation',      'Inspiring quotes and motivational artwork to fuel your ambition', '#FFD700', 3, true,
   NULL, NULL, NULL),
  ('Sports',          'sports',          'Iconic sports moments, athlete art, and stadium photography', '#22C55E', 4, true,
   NULL, NULL, NULL),
  ('Anime & Pop Culture', 'anime-pop-culture', 'Anime, manga, and pop culture wall art', '#FF69B4', 5, true,
   NULL, NULL, NULL),
  ('Nature & Landscape',  'nature-landscape',  'Stunning nature photography and landscape art', '#10B981', 6, true,
   NULL, NULL, NULL),
  ('Minimal & Abstract',  'minimal-abstract',  'Clean minimal art and abstract designs for modern spaces', '#6B7280', 7, true,
   NULL, NULL, NULL),
  ('Custom Frames',   'custom-frames',   'Upload your own photo and get it framed with premium quality', '#CC0000', 8, true,
   NULL, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Intent-based collections
INSERT INTO categories (name, slug, description, display_order, is_active, is_intent_collection) VALUES
  ('Gifts Under ₹999',  'gifts-under-999',     'Perfect gifts that won''t break the bank', 100, true, true),
  ('Bedroom Aesthetic', 'bedroom-aesthetic',    'Curated picks to transform your bedroom',  101, true, true),
  ('Study/Work Setup',  'study-work-setup',     'Motivational art for your workspace',      102, true, true),
  ('Couple/Romantic',   'couple-romantic',      'Romantic wall art for couples',            103, true, true),
  ('Festival Collection','festival-collection', 'Seasonal festival specials',               104, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 7: ADMIN USER SEED
-- ============================================================================
-- IMPORTANT: Replace 'vijayprasadvvp@gmail.com' with your email below.
-- Then create this email as a user in Supabase Auth → Users → Add user.
-- The admin panel login uses email + ADMIN_PASSWORD (Cloudflare secret).

INSERT INTO admin_users (email, role, is_active)
VALUES ('vijayprasadvvp@gmail.com', 'superadmin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SECTION 8: SAMPLE PRODUCTS (placeholder — replace with real images later)
-- ============================================================================

INSERT INTO products (name, slug, description, category_id, is_placeholder, is_active,
                       seo_title, seo_description, tags, care_details, size_guide)
SELECT
  'Shree Ganesh Golden Aura', 'shree-ganesh-golden-aura',
  'Bring divine energy into your space with this stunning Lord Ganesh artwork. The golden tones and intricate detailing create a warm, sacred atmosphere perfect for your puja room or living area.',
  id, true, true,
  'Shree Ganesh Golden Aura Wall Art | PhotoFrameIn',
  'Buy Shree Ganesh golden artwork. Premium framed print with rich golden tones. Perfect for puja room. Free delivery ₹799+',
  ARRAY['divine', 'ganesh', 'god', 'spiritual', 'puja'],
  'Avoid direct sunlight. Wipe frame with dry cloth only.',
  'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'
FROM categories WHERE slug = 'divine'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, category_id, is_placeholder, is_active,
                       seo_title, seo_description, tags, care_details, size_guide)
SELECT
  'Midnight Lamborghini Neon', 'midnight-lambo-neon',
  'A Lamborghini Aventador slicing through neon-lit city streets at midnight. The electric blue and purple reflections make this the ultimate wall art for car enthusiasts.',
  id, true, true,
  'Midnight Lamborghini Neon Wall Art | PhotoFrameIn',
  'Lamborghini neon city wall art. Premium framed poster for car lovers. Dark aesthetic, vibrant colors.',
  ARRAY['automotive', 'lamborghini', 'neon', 'supercar', 'night'],
  'Avoid direct sunlight. Wipe frame with dry cloth only.',
  'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'
FROM categories WHERE slug = 'automotive'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, category_id, is_placeholder, is_active,
                       seo_title, seo_description, tags, care_details, size_guide)
SELECT
  'Porsche 911 Sunset Drive', 'porsche-911-sunset-drive',
  'A classic Porsche 911 cruising along a coastal highway at golden hour. Warm sunset tones and open road vibes that bring freedom to your wall.',
  id, true, true,
  'Porsche 911 Sunset Drive Wall Art | PhotoFrameIn',
  'Porsche 911 sunset coastal drive poster. Premium framed print. Perfect for car enthusiasts.',
  ARRAY['automotive', 'porsche', '911', 'sunset', 'coastal'],
  'Avoid direct sunlight. Wipe frame with dry cloth only.',
  'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'
FROM categories WHERE slug = 'automotive'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, category_id, is_placeholder, is_active,
                       seo_title, seo_description, tags, care_details, size_guide)
SELECT
  'Grind in Silence', 'grind-in-silence',
  'Bold typography on dark background — "GRIND IN SILENCE. LET SUCCESS MAKE THE NOISE." A powerful daily reminder for your workspace.',
  id, true, true,
  'Grind in Silence Motivational Poster | PhotoFrameIn',
  'Grind in Silence motivational wall art. Bold typography poster for workspace. Premium framed print.',
  ARRAY['motivation', 'quotes', 'hustle', 'success', 'workspace'],
  'Avoid direct sunlight. Wipe frame with dry cloth only.',
  'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'
FROM categories WHERE slug = 'motivation'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 9: PRODUCT VARIANTS (for all placeholder products)
-- ============================================================================

DO $$
DECLARE prod RECORD;
BEGIN
  FOR prod IN SELECT id, slug FROM products WHERE is_placeholder = TRUE LOOP
    -- A4 (loss-leader / discovery tier)
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku,
                                   box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES (prod.id, 'A4', 'No Frame', 99, 199, prod.slug || '-a4-noframe', 35, 25, 0.5, 0.09, 0.1)
    ON CONFLICT (sku) DO NOTHING;
    -- Small
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku,
                                   box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES
      (prod.id, 'Small', 'No Frame',  199,  349, prod.slug || '-sm-noframe',   38, 30, 5, 1.14, 0.3),
      (prod.id, 'Small', 'Standard',  449,  699, prod.slug || '-sm-standard',  38, 30, 5, 1.14, 0.8),
      (prod.id, 'Small', 'Premium',   699,  999, prod.slug || '-sm-premium',   38, 30, 5, 1.14, 1.0)
    ON CONFLICT (sku) DO NOTHING;
    -- Medium
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku,
                                   box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES
      (prod.id, 'Medium', 'No Frame',  299,  499, prod.slug || '-md-noframe',  50, 38, 7, 2.66, 0.5),
      (prod.id, 'Medium', 'Standard',  749, 1299, prod.slug || '-md-standard', 50, 38, 7, 2.66, 1.5),
      (prod.id, 'Medium', 'Premium',   999, 1499, prod.slug || '-md-premium',  50, 38, 7, 2.66, 2.0)
    ON CONFLICT (sku) DO NOTHING;
    -- Large
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku,
                                   box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES
      (prod.id, 'Large', 'No Frame',   399,   699, prod.slug || '-lg-noframe',  55, 42, 8, 3.70, 0.8),
      (prod.id, 'Large', 'Standard',  1099,  1599, prod.slug || '-lg-standard', 55, 42, 8, 3.70, 2.5),
      (prod.id, 'Large', 'Premium',   1399,  1999, prod.slug || '-lg-premium',  55, 42, 8, 3.70, 3.0)
    ON CONFLICT (sku) DO NOTHING;
    -- XL
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku,
                                   box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES
      (prod.id, 'XL', 'No Frame',   499,  899, prod.slug || '-xl-noframe',   80, 55, 10, 8.80, 1.2),
      (prod.id, 'XL', 'Standard',  1699, 2499, prod.slug || '-xl-standard',  80, 55, 10, 8.80, 4.0),
      (prod.id, 'XL', 'Premium',   2199, 2999, prod.slug || '-xl-premium',   80, 55, 10, 8.80, 5.0)
    ON CONFLICT (sku) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 10: SAMPLE COMBOS / BUNDLES
-- ============================================================================

INSERT INTO combos (name, slug, description, items, original_price, combo_price,
                     savings_percent, display_order, category, is_active) VALUES
  ('Dive Art Collection Pack',     'dive-art-collection',     '3 divine frames — curated for your puja room or sacred space',
   '{"count": 3, "size": "Small", "frame": "Standard", "category": "divine"}', 2247, 1999, 11, 1, 'divine', true),
  ('Automotive Dream Pack',        'automotive-dream-pack',   '2 premium automotive prints — your garage, elevated',
   '{"count": 2, "size": "Medium", "frame": "Standard", "category": "automotive"}', 1498, 1299, 13, 2, 'automotive', true),
  ('Bedroom Aesthetic Kit',        'bedroom-aesthetic-kit',   '5 small framed prints for the same room vibe',
   '{"count": 5, "size": "Small", "frame": "Standard"}', 2245, 1799, 20, 3, 'general', true),
  ('Focus Mode Workspace Set',     'focus-mode-workspace',    '5 motivation prints — minimal, monochrome, powerful',
   '{"count": 5, "size": "Small", "frame": "Standard", "category": "motivation"}', 2245, 1799, 20, 4, 'general', true),
  ('Premium Gift Frame',           'premium-gift-frame',      '1 Medium Premium frame — perfect as a gift',
   '{"count": 1, "size": "Medium", "frame": "Premium"}', 999, 899, 10, 5, 'general', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 11: DEFAULT FAQ
-- ============================================================================

INSERT INTO faq (question, answer, display_order) VALUES
  ('Will my frame break during delivery?',  'No. We use 5-layer protective packaging with corner protectors. If it arrives damaged, film your unboxing and we replace it free — no questions asked.', 1),
  ('How long does delivery take?',          '3–5 business days across India. 1–3 days in Hyderabad (500xxx pincodes).', 2),
  ('Is COD available?',                     'Yes, for orders above ₹499. A ₹49 confirmation fee applies. WhatsApp confirmation required within 24 hours.', 3),
  ('What is your return/refund policy?',    'Damaged items are replaced free — unboxing video required. Custom frames are non-returnable. See our Returns page for full details.', 4),
  ('Can I cancel my order?',                'Yes, within 24 hours if not yet dispatched. After dispatch, cancellations are not possible.', 5),
  ('Do you do custom photo frames?',        'Yes! Upload your photo on our Custom Frames page. Minimum resolution 1500×2000px. Custom frames are prepaid only and non-returnable.', 6),
  ('What payment methods do you accept?',   'All UPI apps (GPay, PhonePe, Paytm), credit/debit cards, net banking, and Cash on Delivery (₹499–₹1,995).', 7),
  ('How do I track my order?',              'Visit our Track page and enter your Order ID (PS-XXXXXX) or registered phone number. You will also receive tracking updates via email.', 8)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 12: DEFAULT PAGES (policies, terms, shipping, privacy)
-- ============================================================================

INSERT INTO pages (slug, title, content) VALUES
  ('returns', 'Returns & Refund Policy',
   '<h2>Returns & Refund Policy</h2><p>At PhotoFrameIn, we want you to be completely happy with your purchase.</p><h3>Damage Claims</h3><p>If your order arrives damaged, we will replace it free. <strong>An unboxing video is mandatory</strong> for all damage claims.</p><h3>Custom Frames</h3><p><strong>Custom frame orders are final — no returns or cancellations.</strong></p><h3>Cancellations</h3><p>Orders can be cancelled within 24 hours of placing if not yet dispatched.</p><h3>Refund Timeline</h3><ul><li>Prepaid, not dispatched, within 24h: 5–7 business days</li><li>COD, not dispatched: 2–3 business days via UPI/bank transfer</li><li>Damaged with video: Free replacement in 3–5 days</li></ul>'),
  ('terms', 'Terms & Conditions',
   '<h2>Terms & Conditions</h2><p>By using PhotoFrameIn, you agree to these terms.</p><h3>Orders</h3><p>All orders are made-to-order. Delivery timeline is 3–5 business days.</p><h3>COD Policy</h3><p>COD available ₹499–₹1,995. A non-refundable ₹49 COD fee applies. Orders must be confirmed via WhatsApp within 24 hours.</p>'),
  ('shipping', 'Shipping Policy',
   '<h2>Shipping Policy</h2><p>We dispatch orders within 12 hours of confirmation.</p><h3>Delivery</h3><ul><li>Hyderabad (500xxx): 1–3 business days</li><li>Rest of India: 3–5 business days</li></ul><h3>Charges</h3><ul><li>Prepaid above ₹799: FREE</li><li>Prepaid below ₹799: ₹79</li><li>COD Small/Medium: ₹99</li><li>COD Large/XL: ₹149</li></ul>'),
  ('privacy', 'Privacy Policy',
   '<h2>Privacy Policy</h2><p>PhotoFrameIn collects only essential information to process orders. We never sell your data. Payments are processed securely by Razorpay.</p>')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- END OF SCRIPT
-- Run this once in Supabase SQL Editor. Safe to re-run.
-- ============================================================================
