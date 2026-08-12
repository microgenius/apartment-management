-- Gelir ve gider kayıtları (kasa defteri).
--
-- Neden ledgers'tan ayrı bir tablo: ledgers DAİRE BAZINDA borç/alacak
-- tutuyor (kim ne kadar aidat borçlu). Burada tutulan ise SİTENİN kasası
-- (para girdi mi çıktı mı). Tahsil edilen aidat ikisine birden yazılıyor:
-- ledgers'ta o dairenin borcu kapanıyor, burada siteye gelir olarak
-- giriyor. Gider tarafının ise ledgers'ta karşılığı yok.
--
-- source: kaydın nereden geldiği
--   'dues'   -> tahsilat sırasında otomatik oluşan gelir
--   'manual' -> elle girilen gelir/gider
-- Otomatik kayıtların açıklaması sistem tarafından üretilir; elle
-- girilenlerde açıklama serbest metin ("2600 TL noter gideri").
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'dues')),
  -- Otomatik aidat gelirinde hangi daireden geldiği; elle girişte boş
  resident_id BIGINT REFERENCES residents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_resident_id ON transactions(resident_id);

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS
-- ==========================================
-- Sakinler sitenin parasının nereye gittiğini görebilmeli (şeffaflık), ama
-- KİMİN NE KADAR AİDAT ÖDEDİĞİNİ görmemeli - o kişisel bilgi.
--
-- Bu yüzden okuma iki kademeli:
--   * Giderler ve elle girilen gelirler: herkese açık, kalem kalem
--   * Aidat tahsilatları (source='dues'): yalnızca yönetici/yardımcısı
--     satır bazında görebilir. Sakinler yalnızca TOPLAMI görür ve o da
--     aşağıdaki dues_income_total() fonksiyonundan gelir.
--
-- Arayüzde toplamak tek başına yeterli olmazdı: anon anahtarı olan biri
-- tabloyu doğrudan sorgulayıp isimleri okuyabilirdi.
--
-- has_duty() ve is_admin() enable_rls.sql'de tanımlanıyor; bu betiği
-- ondan SONRA çalıştırın.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
  USING (is_admin() OR has_duty() OR source <> 'dues');

-- Sakinlerin aidat gelirini tek kalem olarak görebilmesi için toplam.
-- SECURITY DEFINER: satırları okuyamayan kullanıcı da toplamı alabilsin,
-- ama tek tek kayıtlara asla erişemesin.
CREATE OR REPLACE FUNCTION dues_income_total()
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE type = 'income' AND source = 'dues';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION dues_income_total() TO authenticated;

DROP POLICY IF EXISTS "transactions_insert" ON transactions;
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_duty());

DROP POLICY IF EXISTS "transactions_update" ON transactions;
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated
  USING (is_admin() OR has_duty()) WITH CHECK (is_admin() OR has_duty());

DROP POLICY IF EXISTS "transactions_delete" ON transactions;
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated
  USING (is_admin() OR has_duty());

-- ==========================================
-- Doğrulama
-- ==========================================
SELECT type, source, COUNT(*), COALESCE(SUM(amount), 0) AS toplam
FROM transactions GROUP BY type, source ORDER BY type, source;

-- Geri alma:
--   DROP TABLE IF EXISTS transactions;
