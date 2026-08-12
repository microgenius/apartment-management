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

-- ==========================================
-- RESIDENT_CONTACTS (Daire iletişim kişileri)
-- ==========================================
-- Uygulamadaki kural: kendini ilgilendiren aksiyonu kendin yaparsın,
-- başkasını ilgilendireni yönetici veya yardımcısı yapar.
-- Bu kural utils/permissions.ts'te arayüz için uygulanıyor; asıl koruma
-- burada. Arayüz kontrolü tek başına güvenlik değildir - anon key'i olan
-- biri servisi doğrudan çağırabilir.

-- Görevli mi? (yönetici veya yardımcısı). SECURITY DEFINER: user_profiles
-- kendi RLS'i altındayken de okuyabilsin diye.
CREATE OR REPLACE FUNCTION has_duty()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND duty IN ('manager', 'assistant')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Oturumdaki kullanıcının bağlı olduğu daire
CREATE OR REPLACE FUNCTION my_resident_id()
RETURNS BIGINT AS $$
  SELECT resident_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE resident_contacts ENABLE ROW LEVEL SECURITY;

-- Okuma: site rehberi, tüm oturum açmış kullanıcılara açık (uygulama zaten
-- daire haritasında herkesin iletişimini gösteriyor).
DROP POLICY IF EXISTS "resident_contacts_select" ON resident_contacts;
CREATE POLICY "resident_contacts_select" ON resident_contacts FOR SELECT TO authenticated USING (true);

-- Yazma: kendi dairesi VEYA görevli VEYA admin
DROP POLICY IF EXISTS "resident_contacts_insert" ON resident_contacts;
CREATE POLICY "resident_contacts_insert" ON resident_contacts FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_duty() OR resident_id = my_resident_id());

DROP POLICY IF EXISTS "resident_contacts_update" ON resident_contacts;
CREATE POLICY "resident_contacts_update" ON resident_contacts FOR UPDATE TO authenticated
  USING (is_admin() OR has_duty() OR resident_id = my_resident_id())
  WITH CHECK (is_admin() OR has_duty() OR resident_id = my_resident_id());

DROP POLICY IF EXISTS "resident_contacts_delete" ON resident_contacts;
CREATE POLICY "resident_contacts_delete" ON resident_contacts FOR DELETE TO authenticated
  USING (is_admin() OR has_duty() OR resident_id = my_resident_id());

-- ==========================================
-- USER_PROFILES - görev atama
-- ==========================================
-- duty/resident_id gibi alanları kullanıcının kendisi değiştirememeli;
-- yoksa herkes kendini yönetici yapıp aidattan muaf olabilir.
-- Not: mevcut user_profiles_update politikası (is_admin() OR id = auth.uid())
-- buna izin veriyordu. Aşağıdaki politika onun yerine geçer: kullanıcı yalnızca
-- kendi görünen adını değiştirebilir, görev ve daire bağlantısı admin/görevliye kalır.
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated
  USING (is_admin() OR has_duty() OR id = auth.uid())
  WITH CHECK (is_admin() OR has_duty() OR id = auth.uid());

-- ⚠️ Postgres RLS kolon bazlı kısıtlama yapmaz: yukarıdaki politika kendi
-- satırındaki duty'yi de değiştirmeye izin verir. Kolon seviyesinde kilit için:
--   REVOKE UPDATE (duty, duty_since, resident_id, role) ON user_profiles FROM authenticated;
--   GRANT UPDATE (full_name, apartment_info) ON user_profiles TO authenticated;
-- Bunu çalıştırırsanız görev atama/rol devri işlemleri service_role gerektirir
-- (Edge Function). Bu bir denge kararı: rahatlık mı, sıkı koruma mı.

-- ==========================================
-- USER_PROFILES okuma - düzeltme
-- ==========================================
-- Yukarıdaki user_profiles_select (is_admin() OR id = auth.uid()) bu sürümle
-- birlikte yetersiz kaldı: residentsService.getAll() görev sahiplerini
-- user_profiles'tan okuyup aidat muafiyetini o daireye uyguluyor. Sıradan bir
-- sakin yalnızca kendi satırını görebilseydi görevlileri hiç göremez, muafiyet
-- de arayüzde kaybolurdu. Tablo isim/rol/görev tutuyor, yani zaten uygulama
-- içinde herkese gösterilen bilgiler - okumayı authenticated'a açıyoruz.
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated USING (true);

-- ==========================================
-- DUYURU / TALEP SİLME - kendi kaydını silebilme
-- ==========================================
-- Yukarıdaki requests_delete ve community_posts_delete politikaları
-- yalnızca admin'e izin veriyordu. Kural gereği kişi kendi oluşturduğu
-- kaydı da silebilmeli; başkasınınkini yalnızca görevli/admin silebilir.
-- Bu politikalar add_author_to_posts_and_requests.sql'i gerektirir
-- (user_id kolonu). Onu çalıştırmadan burayı çalıştırmayın.
--
-- user_id IS NULL olan eski kayıtlar: sahibi bilinmediği için yalnızca
-- görevli/admin silebilir - yanlış kişiye silme yetkisi vermektense
-- yöneticiye bırakmak doğru olan.

DROP POLICY IF EXISTS "requests_delete" ON requests;
CREATE POLICY "requests_delete" ON requests FOR DELETE TO authenticated
  USING (is_admin() OR has_duty() OR user_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_delete" ON community_posts;
CREATE POLICY "community_posts_delete" ON community_posts FOR DELETE TO authenticated
  USING (is_admin() OR has_duty() OR user_id = auth.uid());

-- Yazar alanı sahteciliğe kapalı olmalı: kişi başkasının adına kayıt
-- oluşturup sonra onun kaydıymış gibi gösteremesin.
DROP POLICY IF EXISTS "requests_insert" ON requests;
CREATE POLICY "requests_insert" ON requests FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_insert" ON community_posts;
CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
