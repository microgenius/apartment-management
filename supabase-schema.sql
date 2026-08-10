-- ==========================================
-- APARTMENT MANAGEMENT DATABASE SCHEMA
-- Supabase PostgreSQL
-- ==========================================

-- 1. RESIDENTS TABLE (Sakinler)
CREATE TABLE IF NOT EXISTS residents (
  id BIGSERIAL PRIMARY KEY,
  door TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Kiracı', 'Ev Sahibi')),
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Dolu', 'Boş')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEDGERS TABLE (Borç Kayıtları)
CREATE TABLE IF NOT EXISTS ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'planned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REQUESTS TABLE (Talepler)
CREATE TABLE IF NOT EXISTS requests (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('status_new', 'status_review', 'status_completed')),
  in_agenda BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMUNITY POSTS TABLE (Duyurular)
CREATE TABLE IF NOT EXISTS community_posts (
  id BIGSERIAL PRIMARY KEY,
  user_info TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'event', 'alert', 'agenda')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SETTINGS TABLE (Ayarlar)
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INFO TABLE (İletişim Bilgileri)
CREATE TABLE IF NOT EXISTS info (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('manager', 'assistant', 'muhtar', 'municipality')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RECEIPT REQUESTS TABLE (Makbuz Talepleri)
CREATE TABLE IF NOT EXISTS receipt_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  apartment_info TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_ledgers_resident_id ON ledgers(resident_id);
CREATE INDEX IF NOT EXISTS idx_ledgers_status ON ledgers(status);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_in_agenda ON requests(in_agenda);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(type);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_info_role ON info(role);
CREATE INDEX IF NOT EXISTS idx_receipt_requests_user_id ON receipt_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_requests_status ON receipt_requests(status);

-- ==========================================
-- TRIGGERS (Auto-update updated_at)
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON residents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON ledgers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_info_updated_at BEFORE UPDATE ON info
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_requests_updated_at BEFORE UPDATE ON receipt_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- INITIAL DATA (Seed)
-- ==========================================

-- Info (İletişim Bilgileri)
-- NOT: 'role' unique değil (aynı role'den birden fazla satır olabilir, örn. iki municipality),
-- bu yüzden ON CONFLICT (role) kullanılamaz — (role, name) ikilisiyle idempotent hale getirildi.
INSERT INTO info (role, name, phone)
SELECT v.role, v.name, v.phone FROM (VALUES
  ('muhtar', 'Nazife Şahin', '0507 231 84 20'),
  ('municipality', 'Aydın Büyükşehir', '444 40 09'),
  ('municipality', 'Kuşadası Belediyesi', '0256 460 40 40')
) AS v(role, name, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM info WHERE info.role = v.role AND info.name = v.name
);

-- Reset sequences
SELECT setval('residents_id_seq', (SELECT MAX(id) FROM residents));
SELECT setval('requests_id_seq', (SELECT MAX(id) FROM requests));
SELECT setval('community_posts_id_seq', (SELECT MAX(id) FROM community_posts));