-- ============================================
-- PhotoFrameIn v2 Schema Updates
-- Run these in Supabase SQL Editor
-- ============================================

-- ─── 1. COMBOS / BUNDLES (admin-managed) ───
ALTER TABLE combos ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS badge_text TEXT; -- e.g. "Best Value", "Popular"
ALTER TABLE combos ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'; -- 'divine', 'automotive', 'general'
ALTER TABLE combos ADD COLUMN IF NOT EXISTS savings_percent INTEGER DEFAULT 0;

-- ─── 2. REVIEWS — admin moderation fields ───
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website'; -- 'website', 'google', 'instagram', 'imported'

-- ─── 3. SOCIAL & MARKETING LINKS (system_config already handles this) ───
-- Add new config keys for social / marketing
INSERT INTO system_config (key, value, description) VALUES
  ('instagram_link', '', 'Instagram profile URL'),
  ('facebook_link', '', 'Facebook page URL'),
  ('youtube_link', '', 'YouTube channel URL'),
  ('twitter_link', '', 'Twitter/X profile URL'),
  ('whatsapp_number', '917989531818', 'WhatsApp business number (with country code, no +)'),
  ('whatsapp_business_link', '', 'WhatsApp Business catalog link'),
  ('google_business_link', '', 'Google Business Profile URL'),
  ('shiprocket_tracking_base', 'https://shiprocket.co/tracking/', 'Base URL for Shiprocket tracking'),
  ('delhivery_tracking_base', 'https://www.delhivery.com/track/package/', 'Delhivery tracking URL'),
  ('dtdc_tracking_base', 'https://www.dtdc.in/tracking.asp?txbkp=', 'DTDC tracking URL'),
  ('bluedart_tracking_base', 'https://www.bluedart.com/tracking', 'BlueDart tracking URL'),
  ('premium_frame_surcharge', '250', 'Extra charge for premium frame type'),
  ('volume_discount_2', '100', 'Discount for 2 items (₹)'),
  ('volume_discount_3', '250', 'Discount for 3 items (₹)'),
  ('volume_discount_5_pct', '20', 'Discount % for 5+ items'),
  ('divine_hero_title', 'Sacred Art for Sacred Spaces', 'Divine category hero title'),
  ('divine_hero_subtitle', 'Ganesha, Shiva, Hanuman, Krishna, Rama — framed in pure devotion', 'Divine category hero subtitle'),
  ('automotive_hero_title', 'Speed. Elegance. Obsession.', 'Automotive category hero title'),
  ('automotive_hero_subtitle', 'Porsche, Ferrari, Hypercars — frame the machines you love', 'Automotive category hero subtitle'),
  ('cac_instagram', '0', 'CAC from Instagram Ads (₹)'),
  ('cac_google', '0', 'CAC from Google Ads (₹)'),
  ('cvr_divine', '0', 'Conversion rate % for divine category'),
  ('cvr_automotive', '0', 'Conversion rate % for automotive category'),
  ('ads_budget_monthly', '3000', 'Monthly ad budget (₹)')
ON CONFLICT (key) DO NOTHING;

-- ─── 4. ORDER TRACKING — carrier URL per order ───
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_label_url TEXT;

-- ─── 5. PRODUCT COMBOS JUNCTION ───
CREATE TABLE IF NOT EXISTS combo_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  display_name TEXT,
  display_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_combo_products_combo ON combo_products(combo_id);

-- ─── 6. AD PERFORMANCE TRACKING ───
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  platform TEXT NOT NULL, -- 'instagram', 'google', 'facebook', 'organic'
  campaign TEXT,
  ad_spend INTEGER DEFAULT 0, -- in paise/paisa
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  cac INTEGER DEFAULT 0, -- cost per acquisition in ₹
  category TEXT, -- 'divine', 'automotive', 'general'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, platform, campaign)
);
CREATE INDEX IF NOT EXISTS idx_ad_perf_date ON ad_performance(date);
CREATE INDEX IF NOT EXISTS idx_ad_perf_platform ON ad_performance(platform);

-- ─── 7. EMAIL FAILURES TABLE (if not exists) ───
CREATE TABLE IF NOT EXISTS email_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  email TEXT,
  subject TEXT,
  error TEXT,
  service TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. SALES FUNNEL EVENTS (if not exists) ───
CREATE TABLE IF NOT EXISTS sales_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  product_id UUID,
  order_id TEXT,
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sfunnel_type ON sales_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sfunnel_created ON sales_funnel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sfunnel_utm ON sales_funnel_events(utm_source);

-- ─── 9. ADMIN USERS TABLE ───
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('superadmin', 'manager', 'logistics', 'support')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. REVIEWS PUBLIC POLICY UPDATE ───
-- Allow all reviews to be read with the approved filter (already set by service key)
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (is_approved = TRUE AND is_hidden = FALSE);

-- ─── 11. EMAIL LOG (if not exists) ───
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  recipient TEXT,
  subject TEXT,
  service TEXT, -- 'brevo' or 'resend'
  status TEXT DEFAULT 'sent',
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_log_svc ON email_log(service, created_at);

-- ─── 12. LEADS TABLE (if not exists) ───
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  name TEXT,
  source TEXT DEFAULT 'exit_intent',
  utm_source TEXT,
  utm_medium TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

