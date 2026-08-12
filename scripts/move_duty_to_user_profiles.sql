-- Görevi daireden KİŞİYE taşı.
--
-- add_resident_duties.sql görevi residents'a yazıyordu. Aidat muafiyeti için
-- doğruydu (aidat daireden alınıyor), ama yetki için yanlış: bir daireye
-- birden fazla hesap bağlanabildiği için yöneticinin eşi de otomatik yönetici
-- yetkisi kazanırdı. Yetki kişiye ait olmalı.
--
-- Yeni model:
--   user_profiles.duty       -> yetkiyi taşır (manager | assistant)
--   user_profiles.duty_since -> muafiyetin başladığı tarih
--   muafiyet                 -> görevlinin bağlı olduğu daireye (resident_id) uygulanır
--
-- Görev el değiştirdiğinde eski görevli hem yetkisini hem muafiyetini
-- kendiliğinden kaybeder; ayrıca rol güncellemesi gerekmez.
--
-- Run AFTER add_resident_duties.sql ve move_link_to_user_profiles.sql.
-- Idempotent.

-- ==========================================
-- STEP 1 - kolonlar
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'duty'
    ) THEN
        ALTER TABLE user_profiles
          ADD COLUMN duty TEXT CHECK (duty IN ('manager', 'assistant'));
        RAISE NOTICE 'Column duty added to user_profiles';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'duty_since'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN duty_since DATE;
        RAISE NOTICE 'Column duty_since added to user_profiles';
    END IF;
END $$;

-- Aynı anda tek yönetici ve tek yardımcı
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_duty_unique
  ON user_profiles(duty) WHERE duty IS NOT NULL;

-- ==========================================
-- STEP 2 - mevcut görevleri taşı
-- ==========================================
-- Görevli dairenin BİRDEN FAZLA hesabı varsa hangisinin yönetici olduğu
-- belirsizdir; bu yüzden yalnızca tek hesabı olan daireler otomatik taşınır.
-- Çok hesaplı daireler STEP 4'te raporlanır, yöneticiyi Ayarlar'dan seçin.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'duty'
    ) THEN
        UPDATE user_profiles p
        SET duty = r.duty,
            duty_since = r.duty_since
        FROM residents r
        WHERE p.resident_id = r.id
          AND r.duty IS NOT NULL
          AND p.duty IS NULL
          AND (SELECT COUNT(*) FROM user_profiles x WHERE x.resident_id = r.id) = 1;
        RAISE NOTICE 'Tek hesaplı dairelerin görevleri user_profiles''a taşındı';
    END IF;
END $$;

-- ==========================================
-- STEP 3 - doğrulama
-- ==========================================
SELECT p.full_name, p.duty, p.duty_since, r.door, r.name AS daire_sahibi
FROM user_profiles p
LEFT JOIN residents r ON r.id = p.resident_id
WHERE p.duty IS NOT NULL
ORDER BY p.duty;

-- ==========================================
-- STEP 4 - elle çözülmesi gerekenler
-- ==========================================
-- Görevi olan ama çok hesaplı olduğu için taşınamayan daireler:
SELECT r.door, r.name, r.duty,
       (SELECT COUNT(*) FROM user_profiles x WHERE x.resident_id = r.id) AS hesap_sayisi,
       'Yöneticiyi Ayarlar''dan seçin' AS yapilacak
FROM residents r
WHERE r.duty IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.resident_id = r.id AND p.duty IS NOT NULL);

-- Görevi olup hiçbir daireye bağlı olmayan hesaplar (muafiyet uygulanamaz):
SELECT full_name, duty, 'Sakin kaydına bağlı değil - muafiyet uygulanmaz' AS uyari
FROM user_profiles
WHERE duty IS NOT NULL AND resident_id IS NULL;

-- ==========================================
-- STEP 5 - eski kolonları düşür (STEP 3/4 temizse)
-- ==========================================
-- Bilerek yorumda: çalıştırınca eski görev bilgisi geri dönüşsüz gider.
--
-- DROP INDEX IF EXISTS idx_residents_duty_unique;
-- ALTER TABLE residents DROP COLUMN IF EXISTS duty;
-- ALTER TABLE residents DROP COLUMN IF EXISTS duty_since;
