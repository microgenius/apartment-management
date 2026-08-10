-- Enable Row Level Security across all tables.
-- Right now the anon key alone is enough to write (or delete) any row in any
-- table - RLS is completely off. This script closes that off.
--
-- Scope of this pass: lock down WRITES to the correct role (mostly admin-only),
-- keep READS exactly as permissive as they are today (any authenticated user
-- can read every table, same as the app already does by fetching everything
-- and filtering client-side). This is intentionally NOT the final state -
-- once every `residents` row has been linked to a user_id (see
-- add_residents_user_id.sql + the "Sakin Kaydına Bağla" picker in Settings),
-- residents/ledgers SELECT can be tightened to "own row or admin" too. Doing
-- that now would lock out every resident from seeing their own debt, since
-- right after the user_id migration nobody is linked yet.
--
-- Safe to run multiple times (DROP POLICY IF EXISTS before each CREATE).
-- Review before running against production - test on a staging project first.

-- Helper: is the current auth user an admin? SECURITY DEFINER so it can read
-- user_profiles even though user_profiles itself has RLS enabled below
-- (avoids the policy trying to evaluate itself).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- RESIDENTS
-- ==========================================
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "residents_select" ON residents;
CREATE POLICY "residents_select" ON residents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "residents_write" ON residents;
CREATE POLICY "residents_write" ON residents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- LEDGERS
-- ==========================================
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledgers_select" ON ledgers;
CREATE POLICY "ledgers_select" ON ledgers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ledgers_write" ON ledgers;
CREATE POLICY "ledgers_write" ON ledgers FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- REQUESTS (Talepler)
-- ==========================================
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select" ON requests;
CREATE POLICY "requests_select" ON requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "requests_insert" ON requests;
CREATE POLICY "requests_insert" ON requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "requests_update_delete" ON requests;
CREATE POLICY "requests_update_delete" ON requests FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "requests_delete" ON requests;
CREATE POLICY "requests_delete" ON requests FOR DELETE TO authenticated USING (is_admin());

-- ==========================================
-- COMMUNITY POSTS (Duyurular)
-- ==========================================
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_select" ON community_posts;
CREATE POLICY "community_posts_select" ON community_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "community_posts_insert" ON community_posts;
CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "community_posts_update_delete" ON community_posts;
CREATE POLICY "community_posts_update_delete" ON community_posts FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "community_posts_delete" ON community_posts;
CREATE POLICY "community_posts_delete" ON community_posts FOR DELETE TO authenticated USING (is_admin());

-- ==========================================
-- SETTINGS
-- ==========================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_select" ON settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_write" ON settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- INFO (İletişim Bilgileri)
-- ==========================================
ALTER TABLE info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "info_select" ON info;
CREATE POLICY "info_select" ON info FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "info_write" ON info;
CREATE POLICY "info_write" ON info FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- RECEIPT REQUESTS (Makbuz Talepleri)
-- ==========================================
ALTER TABLE receipt_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipt_requests_select" ON receipt_requests;
CREATE POLICY "receipt_requests_select" ON receipt_requests FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "receipt_requests_insert" ON receipt_requests;
CREATE POLICY "receipt_requests_insert" ON receipt_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "receipt_requests_update_delete" ON receipt_requests;
CREATE POLICY "receipt_requests_update_delete" ON receipt_requests FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "receipt_requests_delete" ON receipt_requests;
CREATE POLICY "receipt_requests_delete" ON receipt_requests FOR DELETE TO authenticated USING (is_admin());

-- ==========================================
-- USER_PROFILES
-- ==========================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated
  USING (is_admin() OR id = auth.uid());

-- INSERT: the on_auth_user_created trigger (SECURITY DEFINER) bypasses RLS for
-- the default self-signup profile, so this only needs to cover the admin's
-- "create user" flow, which inserts a profile row for a DIFFERENT user id.
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated
  USING (is_admin() OR id = auth.uid()) WITH CHECK (is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;
CREATE POLICY "user_profiles_delete" ON user_profiles FOR DELETE TO authenticated USING (is_admin());
