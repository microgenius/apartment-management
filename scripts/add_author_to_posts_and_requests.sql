-- Duyuru ve taleplere gerçek yazar referansı.
--
-- Neden gerekli: community_posts.user_info ve requests.user_name yalnızca
-- görünen ADI metin olarak tutuyor. "Kaydı oluşturan kişi silebilsin" kuralı
-- isim karşılaştırmasıyla kurulamaz - aynı isimli iki kişi, isim değişikliği
-- ya da fazladan bir boşluk yanlış kişiye silme yetkisi verir. Silme geri
-- alınamayan bir işlem olduğu için burada tahmine yer yok.
--
-- user_info / user_name KALDIRILMIYOR: kaydın oluşturulduğu andaki görünen
-- adın anlık kopyası olarak kalıyorlar (kişi sonradan adını değiştirse bile
-- eski duyuru eski adı gösterir). user_id yetki için, isim gösterim için.
--
-- Idempotent.

-- ==========================================
-- STEP 1 - kolonlar
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'community_posts' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE community_posts
          ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column user_id added to community_posts';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'requests' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE requests
          ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column user_id added to requests';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);

-- ==========================================
-- STEP 2 - eski kayıtları isimden eşleştir (yalnızca tek anlamlı olanlar)
-- ==========================================
-- Aynı normalize isme sahip birden fazla profil varsa kimin yazdığı
-- bilinemez; o kayıtlar user_id = NULL kalır ve yalnızca yönetici silebilir.
-- Duyurulardaki isim "Ahmet Yılmaz (Siz)" gibi ek içerebildiği için
-- parantezli kısım atılıyor.
UPDATE community_posts c
SET user_id = p.id
FROM user_profiles p
WHERE c.user_id IS NULL
  AND lower(regexp_replace(btrim(regexp_replace(c.user_info, '\(.*\)', '', 'g')), '\s+', ' ', 'g'))
    = lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g'))
  AND (
    SELECT COUNT(*) FROM user_profiles x
    WHERE lower(regexp_replace(btrim(x.full_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g'))
  ) = 1;

UPDATE requests r
SET user_id = p.id
FROM user_profiles p
WHERE r.user_id IS NULL
  AND lower(regexp_replace(btrim(r.user_name), '\s+', ' ', 'g'))
    = lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g'))
  AND (
    SELECT COUNT(*) FROM user_profiles x
    WHERE lower(regexp_replace(btrim(x.full_name), '\s+', ' ', 'g'))
        = lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g'))
  ) = 1;

-- ==========================================
-- STEP 3 - doğrulama
-- ==========================================
SELECT 'community_posts' AS tablo,
       COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS yazari_bilinen,
       COUNT(*) FILTER (WHERE user_id IS NULL)     AS yazari_bilinmeyen
FROM community_posts
UNION ALL
SELECT 'requests',
       COUNT(*) FILTER (WHERE user_id IS NOT NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL)
FROM requests;

-- Yazarı bilinmeyen kayıtlar: sahibi silemez, yalnızca yönetici silebilir.
SELECT 'duyuru' AS tur, id, user_info AS gorunen_isim, LEFT(content, 40) AS icerik
FROM community_posts WHERE user_id IS NULL
UNION ALL
SELECT 'talep', id, user_name, LEFT(content, 40)
FROM requests WHERE user_id IS NULL;

-- Geri alma:
--   ALTER TABLE community_posts DROP COLUMN IF EXISTS user_id;
--   ALTER TABLE requests DROP COLUMN IF EXISTS user_id;
