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

-- ============================================================================
-- SECTION 13: NEW TABLES (v3.1 additions)
-- ============================================================================

-- Suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review requests table (sent after delivery)
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  review_submitted BOOLEAN DEFAULT false,
  review_id UUID REFERENCES reviews(id)
);
CREATE INDEX IF NOT EXISTS idx_review_requests_order ON review_requests(order_id);

-- SEO tasks table (for tracking AI-generated SEO)
CREATE TABLE IF NOT EXISTS seo_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('site', 'product', 'blog')),
  entity_id TEXT,
  entity_name TEXT,
  generated_by TEXT DEFAULT 'openrouter',
  model_used TEXT,
  result_json JSONB,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 14: SYSTEM CONFIG UPDATES (v3.1)
-- ============================================================================

-- Update COD minimum to ₹899 (was ₹499)
UPDATE system_config SET value = '899', updated_at = NOW()
WHERE key = 'cod_min_value';

-- Add new config keys if not exist
INSERT INTO system_config (key, value) VALUES
  ('whatsapp_disputes', '918333066370'),
  ('bulk_order_phone1', '8333066370'),
  ('bulk_order_phone2', '7989094923'),
  ('poster_enabled', 'false'),
  ('review_photo_enabled', 'true'),
  ('openrouter_model', 'meta-llama/llama-3.1-8b-instruct:free'),
  ('premium_frame_surcharge', '250')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECTION 15: SEO BLOG POSTS (5 posts)
-- ============================================================================

INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, is_published, meta_title, meta_description) VALUES

('Best Photo Frame Sizes for Every Room — Complete Size Guide India 2025',
 'best-photo-frame-sizes-room-guide-2025',
 'Not sure which photo frame size to pick? Our complete guide helps you choose the perfect frame size for bedroom, living room, office, and gallery walls.',
 '<h2>Best Photo Frame Sizes for Every Room</h2>
<p>Choosing the right frame size can transform a wall from ordinary to stunning. Here is our complete guide for Indian homes.</p>
<h3>Small (8×12 inches) — Perfect For:</h3>
<ul><li>Study desks and bookshelves</li><li>Bathroom walls</li><li>Creating gallery clusters (group of 5–7 small frames)</li><li>Budget-friendly gifts</li></ul>
<h3>Medium (12×18 inches) — Most Popular</h3>
<p>Our bestseller. Medium frames work in virtually every room — bedroom accent walls, home office walls, kitchen decor.</p>
<h3>Large (18×24 inches) — Statement Pieces</h3>
<ul><li>Living room feature walls</li><li>Dining room focal points</li><li>Above-sofa arrangements</li></ul>
<h3>XL (24×36 inches) — Gallery-Grade</h3>
<p>For high ceilings and bold statements. Perfect for corporate offices, hotel lobbies, and spacious living rooms.</p>
<h3>Pro Tip: The 57-Inch Rule</h3>
<p>Hang the center of your frame at 57 inches (145 cm) from the floor — the average human eye level. This applies universally and is the standard used by art galleries worldwide.</p>
<h2>Buy Photo Frames Online India</h2>
<p>PhotoFrameIn offers all four sizes starting at ₹499, with Standard and Premium (white mount) options. Free delivery above ₹799.</p>',
 'buying-guide', ARRAY['photo frame sizes', 'frame guide India', 'wall art sizes', 'home decor'], true,
 'Best Photo Frame Sizes for Every Room — Complete Guide India 2025',
 'Find the perfect photo frame size for bedroom, living room, office. Complete size guide from Small 8x12 to XL 24x36. Buy frames from ₹499 with free delivery.'),

('10 Creative Ways to Display Photo Frames on Your Wall',
 'creative-photo-frame-wall-display-ideas',
 'Move beyond single frames! Discover gallery walls, symmetrical grids, staircase arrangements and more creative ways to display photo frames in Indian homes.',
 '<h2>10 Creative Ways to Display Photo Frames on Your Wall</h2>
<p>A single frame is nice. A thoughtfully arranged collection is breathtaking. Here are 10 creative ideas to transform your walls.</p>
<h3>1. The Gallery Wall Cluster</h3>
<p>Mix 5–9 frames of different sizes in a loose cluster. Start from the center and work outward. Use matching frame styles for cohesion.</p>
<h3>2. Symmetrical Grid Layout</h3>
<p>6 or 9 matching frames in a perfect grid. Uniform spacing (usually 2–3 inches). Best for modern, minimalist rooms.</p>
<h3>3. Staircase Arrangement</h3>
<p>Follow the diagonal line of your staircase. Space frames every 8 inches along the rail. Creates dramatic visual flow.</p>
<h3>4. The Salon-Style Wall</h3>
<p>Floor-to-ceiling frames packed tightly together. Mix artwork, photos, and mirrors. Bold, maximalist, statement-making.</p>
<h3>5. Single Statement Frame</h3>
<p>One large XL frame (24×36) centered above a sofa or bed. No competing elements. Maximum impact.</p>
<h3>6. Floating Shelves + Frames</h3>
<p>Combine frames with plants, books and objects on floating shelves. Easy to rearrange without re-drilling walls.</p>
<h3>7. The Triptych</h3>
<p>Three frames side-by-side with the same image split across them, or a themed collection (e.g., three Ganesha artworks).</p>
<h3>8. Bedroom Headboard Replacement</h3>
<p>3–5 frames arranged horizontally above the bed. Creates a stunning headboard effect at a fraction of the cost.</p>
<h3>9. Office Motivation Wall</h3>
<p>5 motivational quote frames in your work-from-home setup. Increases productivity and makes video calls look professional.</p>
<h3>10. The Pooja Room Frame Arrangement</h3>
<p>Divine art frames arranged around your home mandir. Ganesha at center, Shiva and Hanuman flanking, Lakshmi below. Spiritually balanced and visually stunning.</p>',
 'decor-ideas', ARRAY['photo frame display ideas', 'gallery wall India', 'wall decor ideas', 'frame arrangement'], true,
 '10 Creative Ways to Display Photo Frames on Your Wall | PhotoFrameIn',
 'Transform your walls with these 10 creative photo frame display ideas — gallery walls, grids, staircase arrangements. Buy premium frames from ₹499.'),

('Why Custom Photo Frames Make the Best Personalised Gifts in India',
 'custom-photo-frames-best-personalised-gifts-india',
 'Looking for a unique, heartfelt gift? Custom photo frames stand out from generic gifts. Here is why personalised frames are the best gift for every occasion in India.',
 '<h2>Why Custom Photo Frames Make the Best Personalised Gifts in India</h2>
<p>In a world of generic gifts — candles, chocolates, gift cards — a custom photo frame stands apart. It is personal. It is lasting. It is meaningful.</p>
<h3>Perfect Occasions for Gifting Frames</h3>
<ul>
<li><strong>Weddings:</strong> A framed couple portrait is one gift that will be displayed for decades</li>
<li><strong>Birthdays:</strong> Upload a favourite memory, frame it professionally</li>
<li><strong>Housewarming:</strong> A beautiful framed divine art piece blesses the new home</li>
<li><strong>Anniversaries:</strong> Premium white-mount frame with a meaningful photo</li>
<li><strong>Corporate gifting:</strong> Branded frames for client gifting or employee awards</li>
</ul>
<h3>What Makes PhotoFrameIn Frames Special</h3>
<ul>
<li>300gsm museum-grade fine art paper — colours stay vivid for 75+ years</li>
<li>Kiln-dried solid hardwood frames — no plastic, no warping</li>
<li>Every custom design is manually verified and upscaled before printing</li>
<li>Premium option includes pure white archival mount — gallery presentation style</li>
</ul>
<h3>How to Order a Custom Frame Gift</h3>
<ol>
<li>Visit our Custom Frames page</li>
<li>Upload your photo (minimum 1500×2000px for best quality)</li>
<li>Choose size and frame style</li>
<li>Add to cart and checkout — we deliver across India in 3–5 days</li>
</ol>
<p>Starting at ₹499. Premium frames from ₹799. Free delivery above ₹799.</p>',
 'gifting', ARRAY['custom photo frame gift India', 'personalised frame gift', 'photo frame gift', 'unique gifts India'], true,
 'Custom Photo Frames — Best Personalised Gifts in India | PhotoFrameIn',
 'Custom photo frames make the best personalised gifts for weddings, birthdays, anniversaries in India. Premium quality from ₹499. Free delivery above ₹799.'),

('Divine Art Frames for Home — Ganesha, Shiva, Hanuman, Krishna Wall Art',
 'divine-art-frames-home-ganesha-shiva-hanuman-krishna',
 'Bring spirituality into your home with premium divine art frames. Discover the best Ganesha, Shiva, Hanuman and Krishna framed wall art for home mandir and living room.',
 '<h2>Divine Art Frames for Your Home</h2>
<p>Art has always been inseparable from Indian spirituality. A beautifully framed divine artwork elevates your home — aesthetically and spiritually.</p>
<h3>Most Popular Divine Art Frames</h3>
<h4>Ganesha Frames</h4>
<p>Lord Ganesha is the remover of obstacles and is traditionally placed at home entrances and in study rooms. Our Ganesha wall art frames feature high-resolution cinematic interpretations perfect for modern homes.</p>
<h4>Shiva Frames</h4>
<p>Mahadev art for meditation rooms, home mandirs and bedrooms. The cosmic energy of Shiva captured in premium fine art printing.</p>
<h4>Hanuman Frames</h4>
<p>Bajrangbali art for courage and strength. Popular in home gyms, study rooms and puja rooms.</p>
<h4>Krishna Frames</h4>
<p>The divine love and wisdom of Krishna — perfect for living rooms, dining rooms and gifting to devotees.</p>
<h3>Where to Hang Divine Art Frames</h3>
<ul>
<li><strong>Home mandir:</strong> Frame directly above or flanking the mandir</li>
<li><strong>Living room:</strong> Feature wall above sofa</li>
<li><strong>Bedroom:</strong> East or north-facing walls (Vastu preferred)</li>
<li><strong>Entrance:</strong> Ganesha at doorway — blessings for all who enter</li>
</ul>
<h3>Frame Options for Divine Art</h3>
<p>All our divine art frames come in Standard (direct print) or Premium (pure white archival mount, gallery style). The white mount adds a museum-quality border that makes the artwork float within the frame.</p>',
 'divine', ARRAY['Ganesha wall art frame', 'divine art frames India', 'Shiva frame', 'Hanuman frame', 'Krishna wall art'], true,
 'Divine Art Frames — Ganesha, Shiva, Hanuman, Krishna Wall Art India',
 'Buy premium divine art frames for home. Ganesha, Shiva, Hanuman, Krishna framed wall art. Perfect for home mandir & living room. From ₹499 with free delivery.'),

('Automotive Art Frames — Porsche, Ferrari, Lamborghini Poster Frames India',
 'automotive-art-frames-porsche-ferrari-lamborghini-india',
 'Turn your love for cars into stunning wall art. Discover premium automotive poster frames — Porsche, Ferrari, Lamborghini, hypercar prints for man-cave, garage and office.',
 '<h2>Automotive Art Frames — For Car Enthusiasts</h2>
<p>Your passion deserves to be on your wall. Automotive art frames transform any room into a gallery of speed, power, and design excellence.</p>
<h3>Why Car Art Frames Are the Perfect Man-Cave Addition</h3>
<ul>
<li>Cinematic, high-detail imagery — not phone photography</li>
<li>Professional colour grading capturing the drama of each car</li>
<li>Solid hardwood frames that match the quality of the art</li>
<li>Sizes from 8×12 to 24×36 — wall art at any scale</li>
</ul>
<h3>Popular Automotive Prints</h3>
<h4>Porsche Frames</h4>
<p>The Porsche 911 is arguably the most iconic sports car ever made. Our Porsche wall art captures the car in cinematic lighting — perfect for offices, home garages and living rooms of car enthusiasts.</p>
<h4>Ferrari Frames</h4>
<p>The prancing horse. Ferrari wall art for the ultimate enthusiast — vibrant reds, dramatic shadows, Italian passion.</p>
<h4>Lamborghini Frames</h4>
<p>Aggressive, angular, unmistakable. Lamborghini framed art makes a bold statement in any room.</p>
<h3>Where to Hang Automotive Frames</h3>
<ul>
<li>Home garage or workshop</li>
<li>Man-cave or gaming room</li>
<li>Home office or study</li>
<li>Corporate office lobby</li>
</ul>
<h3>Gift Ideas for Car Lovers India</h3>
<p>A framed automotive print is the perfect birthday, Diwali, or festive gift for any car enthusiast. Starting ₹499, delivered pan-India in 3–5 days.</p>',
 'automotive', ARRAY['automotive art frames India', 'Porsche poster frame', 'car wall art India', 'Ferrari frame India', 'man cave decor India'], true,
 'Automotive Art Frames — Porsche Ferrari Lamborghini Poster Frames India',
 'Buy premium automotive poster frames — Porsche, Ferrari, Lamborghini car wall art for man-cave, garage, office. From ₹499 with free delivery across India.')

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 16: UPDATE FAQ with new COD range (₹899-₹1995)
-- ============================================================================

UPDATE faq SET answer = 'Yes, for orders between ₹899-₹1,995. A ₹49 COD handling fee applies. WhatsApp confirmation required within 24 hours.',
  updated_at = NOW()
WHERE question ILIKE '%cod available%';

-- ============================================================================
-- END OF v3.1 ADDITIONS — Run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECTION 15: PRODUCT SIZE/FRAME RESTRICTIONS + REVIEW PHOTO CONTROL
-- ============================================================================

-- Add allowed_sizes and allowed_frames columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS allowed_sizes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allowed_frames TEXT DEFAULT NULL;

COMMENT ON COLUMN products.allowed_sizes IS 'Comma-separated list of allowed sizes, e.g. "Small,Medium". NULL = all sizes.';
COMMENT ON COLUMN products.allowed_frames IS 'Comma-separated list of allowed frame types, e.g. "Standard,Premium". NULL = all.';

-- ============================================================================
-- SECTION 16: REVIEW REQUEST TABLE + PHOTO FIELD ON REVIEWS
-- ============================================================================

-- Add photo_url to reviews if not present
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS order_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;

COMMENT ON COLUMN reviews.photo_url IS 'Customer-uploaded photo with review. Only stored if review_photo_enabled=true.';

-- ============================================================================
-- SECTION 17: BLOG POSTS FOR SEO (v3.1)
-- ============================================================================

INSERT INTO blog_posts (title, slug, excerpt, content, category, is_published, created_at)
VALUES
(
  'How to Choose the Perfect Photo Frame Size for Your Home',
  'choose-perfect-photo-frame-size',
  'A complete guide to selecting the right frame size for every room — bedroom, living room, office, and more.',
  '<h2>Frame Sizes Explained</h2>
  <p>Choosing the right frame size can transform a room. Here''s our complete guide:</p>
  <h3>Small (8×12") — Desks &amp; Shelves</h3>
  <p>Perfect for bedside tables, study desks, and floating shelves. Creates intimate displays without overwhelming the space.</p>
  <h3>Medium (12×18") — Bedrooms &amp; Offices</h3>
  <p>Our bestseller. Works perfectly above beds, on home office walls, and in reading nooks. The ideal gift size.</p>
  <h3>Large (18×24") — Living Rooms</h3>
  <p>Statement pieces for living rooms and dining areas. Creates a focal point on feature walls.</p>
  <h3>XL (24×36") — Feature Walls</h3>
  <p>Gallery-quality display. Ideal for large walls in living rooms, hallways, and commercial spaces.</p>
  <h2>Size Guide by Room</h2>
  <ul>
    <li><strong>Bedroom above bed:</strong> Medium or Large (12×18" or 18×24")</li>
    <li><strong>Living room feature wall:</strong> Large or XL (18×24" or 24×36")</li>
    <li><strong>Home office:</strong> Medium (12×18")</li>
    <li><strong>Desk or shelf:</strong> Small (8×12")</li>
    <li><strong>Gifting:</strong> Medium is universally appreciated</li>
  </ul>
  <h2>Order Custom Photo Frames Online in India</h2>
  <p>PhotoFrameIn ships handcrafted frames across India with free delivery above ₹799. Each frame includes ready-to-hang mounting hardware.</p>',
  'buying-guide',
  true,
  NOW() - INTERVAL '7 days'
),
(
  'Top 10 Ganesha Wall Art Frames for Your Home Mandir',
  'ganesha-wall-art-frames-home-mandir',
  'Transform your pooja room or living space with these stunning Lord Ganesha framed art prints — perfect for gifting and home decor.',
  '<h2>Why Ganesha Frames Make the Perfect Home Decor</h2>
  <p>Lord Ganesha, the remover of obstacles, brings positivity and auspiciousness to every home. A premium framed Ganesha print in your mandir, entrance, or living room is both spiritually meaningful and aesthetically beautiful.</p>
  <h2>Best Placements for Ganesha Frames</h2>
  <ul>
    <li><strong>Home Mandir/Pooja Room:</strong> A large Ganesha frame sets a serene, devotional atmosphere</li>
    <li><strong>Main Entrance:</strong> Traditional Vastu placement — Ganesha at the entrance brings blessings</li>
    <li><strong>Living Room:</strong> Creates a spiritual focal point for family gatherings</li>
    <li><strong>Office Desk:</strong> Small frame for daily blessings and positive energy</li>
  </ul>
  <h2>Our Premium Mount Option</h2>
  <p>Elevate your Ganesha frame with our Premium White Mount (+₹250) — a pure white archival border that creates a gallery-quality presentation, just like the finest art galleries. The clean white border draws the eye to the divine image.</p>
  <h2>Order Ganesha Frames Online</h2>
  <p>All PhotoFrameIn divine art frames come with UV-resistant 300gsm museum-quality printing. Free delivery across India. COD available for orders ₹899–₹1995.</p>',
  'divine-art',
  true,
  NOW() - INTERVAL '5 days'
),
(
  'Why Custom Photo Frames Make the Best Personalized Gifts in India',
  'custom-photo-frames-best-personalized-gifts-india',
  'Looking for the perfect gift? A custom photo frame with a personal photo is thoughtful, lasting, and universally loved. Here''s why.',
  '<h2>The Gift That Never Goes Out of Style</h2>
  <p>In a world of disposable gifts, a custom framed photograph stands apart. It''s personal, meaningful, and becomes a lasting keepsake that recipients display for years.</p>
  <h2>Perfect Occasions for Photo Frame Gifts</h2>
  <ul>
    <li><strong>Birthdays:</strong> Frame a favourite memory or milestone photo</li>
    <li><strong>Weddings &amp; Anniversaries:</strong> A couple''s portrait in a premium frame</li>
    <li><strong>Housewarming:</strong> Family photo for their new home</li>
    <li><strong>Graduation:</strong> Proud achievement moment</li>
    <li><strong>Diwali/Festivals:</strong> Divine art or family photo — ideal festive gift</li>
    <li><strong>Corporate Gifting:</strong> Bulk custom frames with company logo or team photos</li>
  </ul>
  <h2>How to Order a Custom Photo Frame</h2>
  <ol>
    <li>Visit our <a href="/customize">Custom Frame page</a></li>
    <li>Upload your photo (JPG/PNG, up to 50MB)</li>
    <li>Select your frame size (Small 8×12" to XL 24×36")</li>
    <li>Choose Standard or Premium (with white mount)</li>
    <li>We manually review, upscale to 4K, and print professionally</li>
    <li>Delivered pan-India in 3–5 business days</li>
  </ol>
  <h2>Bulk & Corporate Orders</h2>
  <p>Planning a bulk order for your team or event? Call us: <strong>8333066370</strong> or <strong>7989094923</strong> for special corporate pricing.</p>',
  'custom-frames',
  true,
  NOW() - INTERVAL '3 days'
),
(
  'Automotive Wall Art: The Best Car Frames for Man Caves and Home Offices',
  'automotive-wall-art-car-frames-man-cave',
  'Porsche, Ferrari, Lamborghini — stunning automotive art frames that transform any space into a petrolhead''s paradise.',
  '<h2>Turn Your Wall Into a Racing Gallery</h2>
  <p>The finest car photography deserves the finest frames. Our automotive art collection features cinematic Porsche, Ferrari, and hypercar prints that bring the thrill of the track to your wall.</p>
  <h2>Best Rooms for Automotive Art</h2>
  <ul>
    <li><strong>Man Cave:</strong> Multiple frames create an immersive automotive gallery</li>
    <li><strong>Home Office:</strong> Inspiration while you work — a Porsche 911 or Ferrari Roma</li>
    <li><strong>Garage:</strong> Complement your actual car with matching automotive art</li>
    <li><strong>Gaming Setup:</strong> Cinematic car prints elevate any gaming battlestation</li>
  </ul>
  <h2>Gallery Wall Tips</h2>
  <p>Mix sizes for visual interest: one XL centerpiece with two Medium frames on either side. Our Standard frame provides a clean, modern look that works perfectly for automotive prints.</p>
  <h2>Buy Automotive Art Frames Online India</h2>
  <p>Free shipping on orders above ₹799. Delivered across India in 3–5 days. COD available ₹899–₹1995.</p>',
  'automotive',
  true,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 18: WRANGLER SECRETS REFERENCE
-- ============================================================================
-- The following secrets must be set in Cloudflare Dashboard or via wrangler:
-- npx wrangler secret put OPENROUTER_API_KEY --project-name photoframein
-- npx wrangler secret put SUPABASE_URL --project-name photoframein
-- npx wrangler secret put SUPABASE_SERVICE_KEY --project-name photoframein
-- npx wrangler secret put CLOUDINARY_CLOUD_NAME --project-name photoframein
-- npx wrangler secret put CLOUDINARY_API_KEY --project-name photoframein
-- npx wrangler secret put CLOUDINARY_API_SECRET --project-name photoframein
-- npx wrangler secret put RAZORPAY_KEY_ID --project-name photoframein
-- npx wrangler secret put RAZORPAY_KEY_SECRET --project-name photoframein

-- ============================================================================
-- SECTION 19: DESIGN PREVIEWS & ADDITIONAL CONFIG
-- ============================================================================

-- Add design_preview_images config (comma-separated Cloudinary URLs, admin-managed)
INSERT INTO system_config (key, value) VALUES
  ('design_preview_image_1', ''),
  ('design_preview_image_2', ''),
  ('design_preview_image_3', ''),
  ('openrouter_api_key_hint', 'Set OPENROUTER_API_KEY as Cloudflare secret — not stored in DB')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECTION 20: SIZE GUIDE TABLE (for product size restrictions reference)
-- ============================================================================
-- Size restrictions are stored in products.allowed_sizes (comma string)
-- and products.allowed_frames (comma string). NULL = all allowed.
-- Example: allowed_sizes = 'Small,Medium' means only those two sizes appear.
-- Example: allowed_frames = 'Standard' hides Premium option for that product.

COMMENT ON COLUMN products.allowed_sizes IS
  'CSV of allowed sizes e.g. "Small,Medium,Large,XL". NULL = all sizes shown.';
COMMENT ON COLUMN products.allowed_frames IS
  'CSV of allowed frame types e.g. "Standard,Premium". NULL = all shown.';

-- ============================================================================
-- SECTION 21: ADDITIONAL BLOG POSTS FOR SEO
-- ============================================================================
INSERT INTO blog_posts (title, slug, excerpt, content, category, is_published, created_at)
VALUES
(
  '5 Frame Sizes Explained — Which One Is Right for Your Wall?',
  'frame-sizes-guide-india',
  'Small 8x12 to XL 24x36 — everything you need to know about choosing the right frame size for your room and wall space.',
  '<h2>Choosing the Right Frame Size</h2>
  <p>One of the most common questions we get at PhotoFrameIn is: "Which size should I order?" The answer depends on three things — where you''re hanging it, how far away you''ll view it, and whether it''s the only frame or part of a gallery wall.</p>
  <h3>Small (8×12" / 20×30 cm)</h3>
  <p>Perfect for desks, shelves, and bedside tables. Works well for portrait photos and smaller rooms. Starting from ₹499.</p>
  <h3>Medium (12×18" / 30×45 cm)</h3>
  <p>Our bestseller. Great for bedrooms, home offices, and single-frame walls. Enough presence without overwhelming the room. From ₹799.</p>
  <h3>Large (18×24" / 45×60 cm)</h3>
  <p>A statement piece for living rooms and dining areas. Works beautifully with divine art and automotive prints. From ₹1,149.</p>
  <h3>XL (24×36" / 60×90 cm)</h3>
  <p>Feature wall hero. Best for open-plan living areas, studios, and commercial spaces. Maximum visual impact. From ₹1,749.</p>
  <h2>Gallery Wall Tip</h2>
  <p>Mix a Large centerpiece with two Small frames on either side for a professional gallery wall look. Total investment: under ₹2,500.</p>',
  'Size Guide',
  true,
  NOW() - INTERVAL '5 days'
),
(
  'Premium White Mount Frames — What Is a Mat Board and Why It Matters',
  'premium-white-mount-frames-mat-board',
  'Learn what archival mount boards are, why galleries use them, and how our Premium frames replicate the gallery look at home.',
  '<h2>What Is a Mount Mat Board?</h2>
  <p>A mount mat (or mat board) is a thick paper border placed between a frame and the artwork. It creates visual breathing space and is a hallmark of professional gallery framing.</p>
  <h2>Why White Mount Boards Are Standard</h2>
  <p>Pure white archival mat boards are used in museums and galleries because they:</p>
  <ul>
    <li>Make colours in the artwork pop</li>
    <li>Create a clean, professional border</li>
    <li>Protect the artwork from direct contact with the glass</li>
    <li>Are acid-free, preventing yellowing over time</li>
  </ul>
  <h2>Our Premium Frame Option</h2>
  <p>Our Premium (+₹250) frame option includes a genuine pure white archival mount board, replicating the exact gallery presentation style. The outer frame is dark, the mount is brilliant white, and your art sits centered in the composition.</p>
  <p>It transforms any print into a gallery-quality piece — perfect for divine art, automotive prints, or your custom photo.</p>',
  'Behind the Scenes',
  true,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SECTION 22: COMPETITOR GAP — COLOUR SCHEME NOTE
-- ============================================================================
-- Analysis: Most Indian frame competitors (Frames & Gifts, Printland, Zoomin)
-- use white/light themes. PhotoFrameIn's dark luxury (#050505 bg, gold accents)
-- is a deliberate differentiator targeting premium buyers (₹750-₹2000 AOV).
-- Recommendation: Keep dark theme. Improve contrast ratio on gray text.
-- Low-effort gap: Add a "Room Visualiser" teaser (coming soon) to stand out.
-- SEO gap: Competitors rank for "photo frames online" but not for:
--   "divine art frames India", "automotive wall art frame", "custom frame Hyderabad"
-- → These are PhotoFrameIn's target keywords with very low competition.

