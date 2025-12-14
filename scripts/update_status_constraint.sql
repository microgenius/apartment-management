-- Migration script to update ledgers table status column to support partial_paid
-- This fixes the error when trying to save partial_paid status to database

-- Step 1: Drop the existing constraint (if any)
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%status%' 
        AND table_name = 'ledgers'
    ) THEN
        ALTER TABLE ledgers DROP CONSTRAINT IF EXISTS ledgers_status_check;
        RAISE NOTICE 'Existing status constraint dropped';
    END IF;
END $$;

-- Step 2: Add new constraint that includes partial_paid
ALTER TABLE ledgers 
ADD CONSTRAINT ledgers_status_check 
CHECK (status IN ('paid', 'unpaid', 'planned', 'partial_paid'));

RAISE NOTICE 'New status constraint added with partial_paid support';

-- Step 3: Verify the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'ledgers_status_check';

-- Step 4: Test that partial_paid is now allowed (optional verification)
-- This will show current status values in use
SELECT DISTINCT status, COUNT(*) 
FROM ledgers 
GROUP BY status 
ORDER BY status;
