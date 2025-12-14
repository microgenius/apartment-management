-- ==========================================
-- USER PROFILES TABLE (Kullanıcı Rolleri)
-- Supabase Auth ile entegre
-- ==========================================

-- User Profiles Table (auth.users ile ilişkili)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('resident', 'admin')),
  apartment_info TEXT, -- Örn: "A Blok - Daire 101"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_updated_at();

-- Index for faster role queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- İlk admin kullanıcısını manuel oluşturmanız gerekiyor:
-- 1. Supabase Dashboard > Authentication > Users > "Add user" 
-- 2. Email ve password girin
-- 3. User oluşturulduktan sonra, aşağıdaki SQL'i çalıştırın (user_id'yi değiştirin):
-- 
-- INSERT INTO user_profiles (id, full_name, role, apartment_info) VALUES
--   ('0c45ded9-4ae4-42dd-9209-a7deba8332f8', 'Sezer Tanrıverdioğlu', 'admin', '19-S');

-- VEYA otomatik trigger ile:
-- Her yeni auth.users kaydı için otomatik user_profile oluştur (varsayılan resident)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role, apartment_info)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    'resident', -- Varsayılan rol
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- NOT: İlk admin kullanıcınızı manuel oluşturup, role'ünü 'admin' yapmanız gerekiyor.
