-- Daire başına iletişim kişileri.
--
-- residents tablosu daire başına TEK kişi tutuyor (name + phone + type).
-- Kiracı oturan bir dairede ev sahibinin bilgisi kayboluyordu. Bu tablo
-- daireye istenen sayıda kişi bağlamayı sağlıyor: ev sahibi, kiracı,
-- acil durum kişisi, vekil...
--
-- residents.name/phone KALDIRILMIYOR: daire listesi, borç ekranı ve mevcut
-- isim eşleştirmesi hâlâ onları kullanıyor. Bu tablo onların üzerine
-- iletişim katmanı ekliyor, yerini almıyor.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS resident_contacts (
  id BIGSERIAL PRIMARY KEY,
  resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('owner', 'tenant', 'emergency', 'other')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resident_contacts_resident_id ON resident_contacts(resident_id);

-- Daire başına en fazla bir birincil kişi. Kısmi index: is_primary = false
-- olan satırlar kısıtın dışında, yani istediğiniz kadar ikincil kişi olabilir.
CREATE UNIQUE INDEX IF NOT EXISTS idx_resident_contacts_one_primary
  ON resident_contacts(resident_id) WHERE is_primary;

DROP TRIGGER IF EXISTS update_resident_contacts_updated_at ON resident_contacts;
CREATE TRIGGER update_resident_contacts_updated_at BEFORE UPDATE ON resident_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Mevcut veriden başlangıç kaydı üret
-- ==========================================
-- Her dairenin bugünkü name/phone bilgisi birincil kişi olarak aktarılıyor.
-- residents.type 'Kiracı' ise kiracı, değilse ev sahibi olarak işaretleniyor.
-- Telefonu boş olan daireler atlanıyor.
INSERT INTO resident_contacts (resident_id, type, name, phone, is_primary)
SELECT r.id,
       CASE WHEN r.type = 'Kiracı' THEN 'tenant' ELSE 'owner' END,
       r.name,
       r.phone,
       TRUE
FROM residents r
WHERE COALESCE(btrim(r.phone), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM resident_contacts c WHERE c.resident_id = r.id
  );

-- ==========================================
-- Doğrulama
-- ==========================================
SELECT r.door, r.name AS daire, c.type, c.name, c.phone, c.is_primary
FROM residents r
LEFT JOIN resident_contacts c ON c.resident_id = r.id
ORDER BY r.door, c.is_primary DESC;

-- ==========================================
-- Geri alma (gerekirse)
-- ==========================================
-- DROP TABLE IF EXISTS resident_contacts;
