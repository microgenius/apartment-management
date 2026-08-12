-- Eski daire numarası.
--
-- Site yeniden numaralandırılmadan önceki daire no'su. Eski defterler,
-- listeler ve sakinlerin alışkanlığı hâlâ o numaraları kullandığı için
-- saklanıyor. Nullable: her daire için bilinmeyebilir.
--
-- Arayüzde daire detay penceresinde başlığın altında gösteriliyor.
-- Idempotent.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'old_door'
    ) THEN
        ALTER TABLE residents ADD COLUMN old_door TEXT;
        RAISE NOTICE 'Column old_door added to residents';
    ELSE
        RAISE NOTICE 'Column old_door already exists on residents';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_residents_old_door ON residents(old_door);

-- Doğrulama
SELECT id, door, old_door, name FROM residents ORDER BY door;

-- Geri alma:
--   DROP INDEX IF EXISTS idx_residents_old_door;
--   ALTER TABLE residents DROP COLUMN IF EXISTS old_door;
