-- Migration 0003: Security + Performance Improvements
-- Adds tables required by the Phase-3 engineering audit fixes

-- ─── Login Attempts (Admin Brute-Force Rate Limiting) ────────────────────────
-- Required by: src/routes/admin.ts → checkDbRateLimit()
-- Purpose: Persistent cross-isolate rate limiting for admin login endpoint.
--   Cloudflare Workers can spawn multiple isolate instances; the old in-memory
--   Map was not shared between them. This table provides a durable counter.
CREATE TABLE IF NOT EXISTS login_attempts (
  id            BIGSERIAL PRIMARY KEY,
  ip_address    TEXT NOT NULL,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast window queries (last 15 minutes per IP)
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip_address, attempted_at DESC);

-- Auto-cleanup: delete records older than 1 hour (keep table lean)
-- Run as a scheduled Supabase cron or pg_cron job:
--   DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 hour';


-- ─── Order Sequence (Atomic Order ID Generation) ─────────────────────────────
-- Required by: src/lib/supabase.ts → generateOrderId()
-- Purpose: Atomic per-day sequence counter to prevent duplicate order IDs.
CREATE TABLE IF NOT EXISTS order_sequence (
  date_key       TEXT PRIMARY KEY,  -- format: YYMMDD e.g. '260530'
  last_sequence  INTEGER NOT NULL DEFAULT 0
);

-- Atomic increment RPC (called by generateOrderId in supabase.ts)
-- Returns the NEW sequence value after incrementing
CREATE OR REPLACE FUNCTION increment_order_sequence(p_date_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE
    SET last_sequence = order_sequence.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  RETURN v_seq;
END;
$$;


-- ─── Customer Stats (Atomic Increment RPC) ────────────────────────────────────
-- Required by: src/routes/orders.ts → increment_customer_stats()
-- Purpose: Safe atomic update to avoid read-modify-write race conditions.
CREATE OR REPLACE FUNCTION increment_customer_stats(
  p_customer_id  UUID,
  p_order_total  NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE customers
  SET
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spend  = COALESCE(total_spend, 0) + p_order_total,
    updated_at   = now()
  WHERE id = p_customer_id;
END;
$$;


-- ─── Error Log (Schema Validation) ────────────────────────────────────────────
-- Ensure error_log has the correct column names as used in supabase.ts
-- (Previous code used 'message' and 'stack'; correct names are 'error_message' and 'stack_trace')
CREATE TABLE IF NOT EXISTS error_log (
  id            BIGSERIAL PRIMARY KEY,
  endpoint      TEXT,
  method        TEXT,
  error_message TEXT,
  stack_trace   TEXT,
  ref_id        TEXT UNIQUE,
  request_body  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_log_ref_id ON error_log (ref_id);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log (created_at DESC);


-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- login_attempts: service role only (no public access)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_attempts_service_only" ON login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- order_sequence: service role only
ALTER TABLE order_sequence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_sequence_service_only" ON order_sequence
  FOR ALL USING (auth.role() = 'service_role');

-- error_log: service role only
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "error_log_service_only" ON error_log
  FOR ALL USING (auth.role() = 'service_role');
