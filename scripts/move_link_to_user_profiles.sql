-- Move the resident<->account link from residents.user_id to
-- user_profiles.resident_id, so ONE resident can have MANY accounts.
--
-- Why the column has to move rather than just lose its unique index:
-- residents.user_id lives on the resident row, so it can only ever hold a
-- single account. Dropping the unique index would allow the opposite of
-- what we want (many residents sharing one account). Putting resident_id
-- on user_profiles gives the correct many-accounts-to-one-resident shape:
-- a flat can have the owner, the spouse and the tenant all logged in,
-- while each account still points at exactly one flat.
--
-- Run AFTER add_residents_user_id.sql (and backfill_residents_user_id.sql
-- if you used it). Existing links are carried over automatically.
-- Idempotent: safe to run more than once.

-- ==========================================
-- STEP 1 - add the new column
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'resident_id'
    ) THEN
        ALTER TABLE user_profiles
          ADD COLUMN resident_id BIGINT REFERENCES residents(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column resident_id added to user_profiles';
    ELSE
        RAISE NOTICE 'Column resident_id already exists on user_profiles';
    END IF;
END $$;

-- Deliberately NOT unique: several accounts may point at the same resident.
CREATE INDEX IF NOT EXISTS idx_user_profiles_resident_id ON user_profiles(resident_id);

-- ==========================================
-- STEP 2 - carry over existing links
-- ==========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'residents' AND column_name = 'user_id'
    ) THEN
        UPDATE user_profiles p
        SET resident_id = r.id
        FROM residents r
        WHERE r.user_id = p.id
          AND p.resident_id IS NULL;
        RAISE NOTICE 'Existing residents.user_id links copied to user_profiles.resident_id';
    END IF;
END $$;

-- ==========================================
-- STEP 3 - verify BEFORE dropping the old column
-- ==========================================
-- Every old link should appear below with esleşti = true.
-- If anything says false, stop and investigate - do not run STEP 4.
SELECT
  r.door,
  r.name          AS resident_name,
  p.full_name     AS user_name,
  (p.resident_id = r.id) AS eslesti
FROM residents r
JOIN user_profiles p ON p.id = r.user_id
ORDER BY r.door;

-- ==========================================
-- STEP 4 - drop the old column (run only after STEP 3 looks right)
-- ==========================================
-- Kept as a separate step on purpose: dropping it destroys the old links,
-- so there is no going back if STEP 2 did not do what you expected.
--
-- ALTER TABLE residents DROP COLUMN IF EXISTS user_id;
-- DROP INDEX IF EXISTS idx_residents_user_id_unique;

-- ==========================================
-- STEP 5 - report
-- ==========================================
-- Accounts not linked to any flat (they see the "not linked yet" state)
SELECT id, full_name, role, apartment_info, 'Sakin kaydına bağlı değil' AS durum
FROM user_profiles
WHERE resident_id IS NULL
ORDER BY full_name;

-- Flats and how many accounts they now have (0 is normal: empty flats,
-- residents who never signed up, bookkeeping-only rows)
SELECT r.door, r.name, COUNT(p.id) AS hesap_sayisi
FROM residents r
LEFT JOIN user_profiles p ON p.resident_id = r.id
GROUP BY r.id, r.door, r.name
ORDER BY r.door;
