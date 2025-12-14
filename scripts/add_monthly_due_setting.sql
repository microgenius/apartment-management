-- Migration script to add monthly_due setting to settings table
-- This script is idempotent - safe to run multiple times

-- Insert monthly_due setting if it doesn't exist
INSERT INTO settings (key, value)
VALUES ('monthly_due', '0')
ON CONFLICT (key) DO NOTHING;

-- Verify the setting was created
SELECT * FROM settings WHERE key = 'monthly_due';
