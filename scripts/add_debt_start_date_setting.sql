-- Migration script to add debt_start_date setting
-- This setting defines the start date for debt calculations
-- Debts before this date will not be included in total debt calculations

-- Add debt_start_date setting if it doesn't exist
INSERT INTO settings (key, value)
VALUES ('debt_start_date', '2024-01-01')
ON CONFLICT (key) DO NOTHING;

-- Verify the setting was added
SELECT * FROM settings WHERE key = 'debt_start_date';
