-- Migration script to link residents to auth users (optional link)
-- Not every resident record will have a matching user account (empty
-- apartments, tenants who never sign up, admin-only bookkeeping, etc.),
-- so this column is nullable. When it IS set, it must be unique: one
-- user account can only be linked to one resident record.
-- This script is idempotent - safe to run multiple times.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'residents'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE residents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column user_id added to residents table';
    ELSE
        RAISE NOTICE 'Column user_id already exists in residents table';
    END IF;
END $$;

-- Enforce one-user-per-resident (multiple NULLs are allowed, Postgres unique indexes ignore NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_residents_user_id_unique ON residents(user_id);

-- Verify
SELECT id, door, name, user_id FROM residents ORDER BY door;
