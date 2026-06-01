-- ============================================================
-- Migration: 0002_custom_frame_schema.sql
-- ChitraFrame — Custom Framing & Site Settings Schema
-- ============================================================

-- 1. Global System Configuration Matrix
CREATE TABLE IF NOT EXISTS public.site_settings_config (
    setting_key TEXT PRIMARY KEY,
    numeric_amount NUMERIC NOT NULL,
    description_notes TEXT,
    last_modified_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO public.site_settings_config (setting_key, numeric_amount, description_notes) VALUES
('base_rate_small',         499.00,  'Base processing rate for small frame footprint (8x12")'),
('base_rate_medium',        799.00,  'Base processing rate for standard medium footprint (12x18")'),
('base_rate_large',        1149.00,  'Base processing rate for large footprint asset (18x24")'),
('base_rate_xl',           1749.00,  'Base processing rate for statement XL scale footprint (24x36")'),
('markup_mount_layer',      250.00,  'Addon cost for white mount processing integration'),
('addon_rolled_poster',     199.00,  'Addon price for extra A3 rolled print duplicate copy'),
('surcharge_cod_handling',   49.00,  'Surcharge applied for processing physical cash returns (COD)'),
('discount_prepaid_payment', 50.00,  'Discount credit incentive applied for digital/UPI checkouts'),
('base_shipping_charge',     99.00,  'Standard freight shipping delivery logistics flat cost'),
('free_shipping_limit_gate', 899.00, 'Subtotal limit metric where delivery cost is waived')
ON CONFLICT (setting_key) DO UPDATE SET
    numeric_amount = EXCLUDED.numeric_amount,
    description_notes = EXCLUDED.description_notes,
    last_modified_date = TIMEZONE('utc'::text, NOW());

-- 2. Custom Framing Intake Logging Pipeline Table
CREATE TABLE IF NOT EXISTS public.custom_framing_orders_intake (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    buyer_fullname TEXT NOT NULL,
    buyer_whatsapp_phone TEXT NOT NULL,
    uploaded_image_storage_path TEXT NOT NULL DEFAULT 'no-upload',
    selected_dimension_profile TEXT NOT NULL CHECK (selected_dimension_profile IN ('Small', 'Medium', 'Large', 'XL')),
    selected_framing_style TEXT NOT NULL CHECK (selected_framing_style IN ('Direct', 'Mount')),
    include_poster_print_copy BOOLEAN NOT NULL DEFAULT FALSE,
    user_special_instructions TEXT,
    computed_subtotal_amount NUMERIC NOT NULL,
    compliance_notice_version TEXT DEFAULT 'Implicit Upload Authorization v1',
    processing_status TEXT NOT NULL DEFAULT 'new' CHECK (processing_status IN ('new', 'in_review', 'in_production', 'shipped', 'completed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cfo_intake_timestamp ON public.custom_framing_orders_intake(intake_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cfo_processing_status ON public.custom_framing_orders_intake(processing_status);
CREATE INDEX IF NOT EXISTS idx_cfo_buyer_phone ON public.custom_framing_orders_intake(buyer_whatsapp_phone);

-- Row Level Security (RLS)
ALTER TABLE public.site_settings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_framing_orders_intake ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access - site_settings" ON public.site_settings_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - custom_framing" ON public.custom_framing_orders_intake
    FOR ALL USING (auth.role() = 'service_role');

-- Anon can read site settings (for frontend pricing display)
CREATE POLICY "Anon read site_settings" ON public.site_settings_config
    FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE public.site_settings_config IS 'Global pricing and configuration values for ChitraFrame. Editable via admin panel.';
COMMENT ON TABLE public.custom_framing_orders_intake IS 'Intake log for custom photo framing orders submitted via the 3-step wizard on /customize.';
