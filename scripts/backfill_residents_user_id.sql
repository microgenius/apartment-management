-- Backfill: link EXISTING user accounts to their residents row.
--
-- add_residents_user_id.sql only adds the (nullable) column - every existing
-- resident starts with user_id = NULL, which means every already-registered
-- user would fall back to the old name-matching path until an admin links
-- them by hand. This script does that linking in bulk, using the same
-- name match the app used before, but only where the match is UNAMBIGUOUS.
--
-- Safety rules (why this won't link the wrong person to someone's debt):
--   * only touches residents where user_id IS NULL
--   * skips users already linked to some resident
--   * a name must match EXACTLY ONE resident AND EXACTLY ONE user, otherwise
--     it is left alone for the admin to resolve in the UI
--   * matching is whitespace- and case-normalised ("  Ahmet   Yılmaz " ==
--     "ahmet yılmaz"), but never fuzzy - no partial/similarity matching,
--     because a wrong link here exposes one resident's ledger to another.
--
-- Run AFTER add_residents_user_id.sql. Idempotent: re-running links only
-- whatever is still unlinked.
--
-- STEP 1 below is a preview (changes nothing). Run it first, eyeball the
-- result, and only then run STEP 2.

-- ==========================================
-- STEP 1 - PREVIEW: what would be linked?
-- ==========================================
WITH r AS (
  SELECT id, name, door,
         lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS n
  FROM residents
  WHERE user_id IS NULL
),
p AS (
  SELECT id, full_name,
         lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) AS n
  FROM user_profiles
  WHERE id NOT IN (SELECT user_id FROM residents WHERE user_id IS NOT NULL)
),
candidate AS (
  SELECT p.id AS user_id, p.full_name, r.id AS resident_id, r.name, r.door, r.n
  FROM p JOIN r ON r.n = p.n
)
SELECT
  c.door,
  c.name        AS resident_name,
  c.full_name   AS user_name,
  c.user_id,
  CASE
    WHEN (SELECT count(*) FROM candidate x WHERE x.n = c.n) = 1
      THEN 'BAĞLANACAK'
    ELSE 'ATLANACAK (isim birden fazla kayıtla eşleşiyor)'
  END AS sonuc
FROM candidate c
ORDER BY sonuc, c.door;

-- ==========================================
-- STEP 2 - APPLY: perform the linking
-- ==========================================
WITH r AS (
  SELECT id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS n
  FROM residents
  WHERE user_id IS NULL
),
p AS (
  SELECT id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) AS n
  FROM user_profiles
  WHERE id NOT IN (SELECT user_id FROM residents WHERE user_id IS NOT NULL)
),
candidate AS (
  SELECT p.id AS user_id, r.id AS resident_id, r.n
  FROM p JOIN r ON r.n = p.n
),
unambiguous AS (
  -- exactly one resident AND one user share this normalised name
  SELECT c.user_id, c.resident_id
  FROM candidate c
  WHERE (SELECT count(*) FROM candidate x WHERE x.n = c.n) = 1
)
UPDATE residents res
SET user_id = u.user_id
FROM unambiguous u
WHERE res.id = u.resident_id
  AND res.user_id IS NULL;

-- ==========================================
-- STEP 3 - REPORT: what still needs manual linking?
-- ==========================================

-- Residents with no account linked (normal for empty flats / non-users,
-- but check for anyone who should have been matched)
SELECT door, name, phone, 'Bağlı hesap yok' AS durum
FROM residents
WHERE user_id IS NULL
ORDER BY door;

-- Accounts not linked to any resident - these users will see the
-- "not linked yet" empty state in the app until an admin links them
SELECT p.id, p.full_name, p.role, p.apartment_info, 'Sakin kaydına bağlı değil' AS durum
FROM user_profiles p
WHERE p.id NOT IN (SELECT user_id FROM residents WHERE user_id IS NOT NULL)
ORDER BY p.full_name;
