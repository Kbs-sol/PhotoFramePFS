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
CREATE TABLE IF NOT EXISTS public.reviews (
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
CREATE TABLE IF NOT EXISTS public.sales_funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT,
    email TEXT,
    event_type TEXT CHECK (event_type IN ('identify', 'add_to_cart', 'checkout_start', 'payment_success', 'view')),
    product_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Coupon usage tracking columns (run if upgrading from v15.2)
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses INTEGER;

-- 8. Users table: track last login
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();

-- Grant RPC access to anon role for view tracking
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_view(TEXT) TO service_role;

-- Row Level Security (ensure tables allow service-key writes)
ALTER TABLE public.view_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policies: allow service_role full access, anon can read coupons/view_stats
CREATE POLICY IF NOT EXISTS "service_role_all_view_stats" ON public.view_stats FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_sales_funnel_events" ON public.sales_funnel_events FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_email_logs" ON public.email_logs FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "service_role_all_coupons" ON public.coupons FOR ALL TO service_role USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_coupons" ON public.coupons FOR SELECT TO anon USING (is_active = true);
