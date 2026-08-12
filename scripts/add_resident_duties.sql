-- Yönetici / yönetici yardımcısı görevi ve aidat muafiyeti.
--
-- Görev daireye (residents) yazılıyor, hesaba (user_profiles) değil:
-- aidat daireden alınıyor, dolayısıyla muafiyet de dairenin defterine
-- uygulanmak zorunda. Görevi olan kişinin uygulamada hesabı hiç olmayabilir.
--
-- duty_since neden var: aidatlar helpers.ts içinde debt_start_date'ten
-- itibaren geriye dönük olarak da üretiliyor. duty_since olmasaydı birini
-- yönetici seçmek, göreve gelmeden ÖNCEKİ aylara ait borçlarını da silerdi.
-- Muafiyet yalnızca göreve başladığı aydan itibaren işliyor.
--
-- Idempotent: tekrar çalıştırmak güvenli.

-- ==========================================
-- STEP 1 - kolonlar
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'duty'
    ) THEN
        ALTER TABLE residents
          ADD COLUMN duty TEXT CHECK (duty IN ('manager', 'assistant'));
        RAISE NOTICE 'Column duty added to residents';
    ELSE
        RAISE NOTICE 'Column duty already exists on residents';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'duty_since'
    ) THEN
        ALTER TABLE residents ADD COLUMN duty_since DATE;
        RAISE NOTICE 'Column duty_since added to residents';
    ELSE
        RAISE NOTICE 'Column duty_since already exists on residents';
    END IF;
END $$;

-- Aynı anda tek yönetici ve tek yardımcı olabilir.
-- Kısmi index: duty NULL olan satırlar kısıtın dışında kalır.
CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_duty_unique
  ON residents(duty) WHERE duty IS NOT NULL;

-- ==========================================
-- STEP 2 - doğrulama
-- ==========================================
SELECT door, name, duty, duty_since
FROM residents
WHERE duty IS NOT NULL
ORDER BY duty;

-- ==========================================
-- Geri alma (gerekirse)
-- ==========================================
-- Sadece görevleri temizler, kolonlar kalır:
--   UPDATE residents SET duty = NULL, duty_since = NULL;
-- Kolonları tamamen kaldırmak için:
--   DROP INDEX IF EXISTS idx_residents_duty_unique;
--   ALTER TABLE residents DROP COLUMN IF EXISTS duty;
--   ALTER TABLE residents DROP COLUMN IF EXISTS duty_since;
