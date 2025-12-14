-- Migration script to add paid_amount column to ledgers table for partial payment tracking
-- This script is idempotent - safe to run multiple times

-- Add paid_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ledgers' 
        AND column_name = 'paid_amount'
    ) THEN
        ALTER TABLE ledgers ADD COLUMN paid_amount NUMERIC(10,2);
        RAISE NOTICE 'Column paid_amount added to ledgers table';
    ELSE
        RAISE NOTICE 'Column paid_amount already exists in ledgers table';
    END IF;
END $$;

-- Update existing paid records to have paid_amount = amount
UPDATE ledgers 
SET paid_amount = amount 
WHERE status = 'paid' AND paid_amount IS NULL;

-- Verify the changes
SELECT 
    id, 
    resident_id, 
    date, 
    description, 
    amount, 
    paid_amount,
    status 
FROM ledgers 
ORDER BY date DESC 
LIMIT 10;
