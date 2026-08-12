-- Ağustos 2026 dahil devir borçlarının içeri aktarımı + eski daire numaraları.
--
-- ⚠️ ÖNCE OKUYUN - bu script para verisi yazıyor.
--
-- Veriler el yazısı bir listeden okundu. Okunan tutarların toplamı 38.400,
-- kağıdın altında yazan toplam ise 36.000. Aradaki 2.400 fark, en az bir
-- satırda isim-tutar eşleşmesinin yanlış okunduğunu gösteriyor.
-- STEP 1 bu farkı kontrol eder ve tutmuyorsa ilerlemeyi durdurur.
-- Aşağıdaki veri bloğunu kendi listenizle karşılaştırıp düzeltin.
--
-- Not: tutarlar TEK BİR AYIN aidatı değil, "Ağustos ayı dahil" birikmiş
-- bakiye. Bu yüzden tek bir "devir borcu" satırı olarak yazılıyor ve
-- debt_start_date Eylül 2026'ya çekiliyor (STEP 5). Aksi halde uygulama
-- geçmiş aylar için ayrıca aidat üretip borcu ikiye katlardı.

-- ==========================================
-- VERİ - düzeltilecek tek yer burası
-- eski_daire_no | isim | ağustos dahil bakiye
-- ==========================================
CREATE TEMP TABLE devir (
  old_door TEXT,
  name     TEXT,
  balance  NUMERIC(10,2)
) ON COMMIT DROP;

INSERT INTO devir (old_door, name, balance) VALUES
  ('1',     'Sıddık Çoban',           600),
  ('2',     'Murat',                 2400),   -- soyadı okunamadı
  ('3',     'Deniz İşli',               0),
  ('4',     'Yahya Bilir',           6200),
  ('5',     'Ali Vurnalı',            300),
  ('6',     'Wesley Bidge',             0),   -- isim okunamadı
  ('7',     'Mehmet Soy',               0),
  ('8',     'Nursel',                4200),   -- soyadı okunamadı
  ('9',     'Recai Mısır',            600),
  ('10',    'Nahit Toşçalı',         1300),
  ('11',    'Volkan Ercelayan',         0),   -- soyadı şüpheli
  ('12',    'Sevil Aksu',             300),
  ('13',    'Ümit Orhan',            1100),
  ('14',    'Nurettin Tok',           600),
  ('15',    'Nursel Nurcan',          300),
  ('16',    'Gülcan Bahçetepe',       300),
  ('17',    'Türkan Ergan',             0),   -- soyadı şüpheli
  ('18',    'Zübeyde Kaygusuz',      2100),
  ('19',    'Ömer Kalaylı',          3600),
  ('20',    'Sema Çetiner',             0),
  ('21',    'Ali Can',                600),
  ('22',    'Sezgin Kaygusuz',          0),
  ('23',    'Veronika Adamson',         0),
  ('24',    'Abdullah 2A',            600),   -- "2A" not mu, isim mi?
  ('25',    'Veronika Boyle',           0),
  ('26',    'Sezen Özkuş',              0),   -- yanında "F" işareti var
  ('27',    'Tekin Uygur',              0),   -- yanında "F" işareti var
  ('28',    'Ali Osman',             3000),
  ('29',    'Sönmez Doğan',          2300),
  ('30',    'Cebrail Akgüneş',          0),
  ('31',    'İbrahim Çetinyol',      3800),
  ('32',    'Sezer Tanrıverdioğlu',  1800),
  ('33',    'Sabri Tunçel',             0),
  ('34',    'Nilüfer Şölen',          300),
  ('35-36', 'Vasfiye Aksoy',         2100),   -- iki daire birleşik
  ('37',    'Bilal Barlas',             0),
  ('38',    'Tamer Önem',               0),
  ('39',    'Fikriye Bölüm',            0),
  ('40',    'Gülden Taş',               0),
  ('41',    'Aysel Bayramoğlu',         0),
  ('42',    'Banu Kerinç',              0),
  ('43',    'Hayrettin Özkaya',         0),
  ('44',    'Hikmet Sevsay',            0);

-- ==========================================
-- STEP 1 - TOPLAM KONTROLÜ (önce bunu çalıştırın)
-- ==========================================
-- 'DÜZELTİN' çıkarsa yukarıdaki veriyi düzeltmeden devam etmeyin.
SELECT SUM(balance) AS okunan_toplam,
       36000        AS kagittaki_toplam,
       SUM(balance) - 36000 AS fark,
       CASE WHEN SUM(balance) = 36000 THEN 'TAMAM - devam edebilirsiniz'
            ELSE 'DÜZELTİN - veri bloğunu gözden geçirin' END AS durum
FROM devir;

-- ==========================================
-- STEP 2 - eski daire numarası kolonu
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'old_door'
    ) THEN
        ALTER TABLE residents ADD COLUMN old_door TEXT;
        RAISE NOTICE 'Column old_door added to residents';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_residents_old_door ON residents(old_door);

-- ==========================================
-- STEP 3 - EŞLEŞME ÖNİZLEMESİ (hiçbir şey değiştirmez)
-- ==========================================
-- Listedeki isimlerin mevcut dairelerle eşleşip eşleşmediğini gösterir.
-- 'YENİ KAYIT' çıkanlar STEP 4'te residents'a eklenecek.
SELECT d.old_door,
       d.name AS listedeki_isim,
       r.door AS mevcut_daire,
       d.balance,
       CASE WHEN r.id IS NULL THEN 'YENİ KAYIT açılacak' ELSE 'eşleşti' END AS durum
FROM devir d
LEFT JOIN residents r
  ON lower(regexp_replace(btrim(r.name), '\s+', ' ', 'g'))
   = lower(regexp_replace(btrim(d.name), '\s+', ' ', 'g'))
ORDER BY length(d.old_door), d.old_door;

-- ==========================================
-- STEP 4 - UYGULA (STEP 1 ve 3 temizse)
-- ==========================================
-- 4a) Eşleşen dairelere eski numarayı yaz
UPDATE residents r
SET old_door = d.old_door
FROM devir d
WHERE lower(regexp_replace(btrim(r.name), '\s+', ' ', 'g'))
    = lower(regexp_replace(btrim(d.name), '\s+', ' ', 'g'))
  AND r.old_door IS DISTINCT FROM d.old_door;

-- 4b) Listede olup sistemde olmayanları ekle.
--     door = eski numara (yeni numarayı bilmiyoruz, sonra düzeltirsiniz)
INSERT INTO residents (door, name, type, phone, status, old_door)
SELECT d.old_door, d.name, 'Ev Sahibi', '', 'Dolu', d.old_door
FROM devir d
WHERE NOT EXISTS (
  SELECT 1 FROM residents r
  WHERE lower(regexp_replace(btrim(r.name), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(d.name), '\s+', ' ', 'g'))
);

-- 4c) Devir borcu satırlarını yaz (bakiyesi 0 olanlar atlanır).
--     Aynı script iki kez çalışırsa borç iki kez yazılmasın diye
--     aynı açıklamalı kayıt varsa atlanıyor.
INSERT INTO ledgers (resident_id, date, description, amount, status, paid_amount)
SELECT r.id, DATE '2026-08-01', 'Devir borcu (Ağustos 2026 dahil)', d.balance, 'unpaid', 0
FROM devir d
JOIN residents r
  ON lower(regexp_replace(btrim(r.name), '\s+', ' ', 'g'))
   = lower(regexp_replace(btrim(d.name), '\s+', ' ', 'g'))
WHERE d.balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM ledgers l
    WHERE l.resident_id = r.id
      AND l.description = 'Devir borcu (Ağustos 2026 dahil)'
  );

-- ==========================================
-- STEP 5 - aidat üretimini Eylül 2026'dan başlat
-- ==========================================
-- Devir borcu Ağustos dahil her şeyi kapsıyor; debt_start_date bundan
-- önceyse uygulama aynı aylar için ikinci kez aidat üretir.
INSERT INTO settings (key, value) VALUES ('debt_start_date', '2026-09-01')
ON CONFLICT (key) DO UPDATE SET value = '2026-09-01';

-- ==========================================
-- STEP 6 - DOĞRULAMA
-- ==========================================
SELECT r.old_door, r.door, r.name,
       COALESCE(SUM(l.amount) FILTER (WHERE l.description = 'Devir borcu (Ağustos 2026 dahil)'), 0) AS devir_borcu
FROM residents r
LEFT JOIN ledgers l ON l.resident_id = r.id
GROUP BY r.id, r.old_door, r.door, r.name
ORDER BY length(COALESCE(r.old_door, 'zz')), r.old_door;

-- Yazılan toplam kağıttaki toplamla aynı olmalı
SELECT SUM(amount) AS yazilan_toplam
FROM ledgers WHERE description = 'Devir borcu (Ağustos 2026 dahil)';

-- ==========================================
-- Geri alma
-- ==========================================
-- DELETE FROM ledgers WHERE description = 'Devir borcu (Ağustos 2026 dahil)';
-- UPDATE residents SET old_door = NULL;
