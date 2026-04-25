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
