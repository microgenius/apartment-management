# Database Migration Scripts

## 1. Monthly Due Setting Migration (`add_monthly_due_setting.sql`)

### Purpose
This script adds the `monthly_due` setting to the `settings` table in your Supabase database.

### How to Run

#### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add_monthly_due_setting.sql`
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
6. Verify the output shows the new setting with `monthly_due` key

#### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db execute --file scripts/add_monthly_due_setting.sql
```

#### Option 3: Via psql (if you have direct database access)
```bash
psql -h your-db-host -U postgres -d postgres -f scripts/add_monthly_due_setting.sql
```

### What This Script Does
- Inserts a new row in the `settings` table with:
  - `key`: `'monthly_due'`
  - `value`: `'0'` (default value)
- Uses `ON CONFLICT (key) DO NOTHING` to make the script safe to run multiple times
- Returns the created setting for verification

### After Running
Once the migration is complete, the application will:
- Automatically load the monthly due value from the database when the Settings page opens
- Allow admins to update this value through the UI
- Store all changes back to the database using the `settings` table

### Verification
After running the script, you can verify it worked by:
1. Opening the Settings page as an admin user
2. The "Aylık Aidat Tutarı" input should show the current value from the database
3. Try changing the value and clicking "Güncelle"
4. Refresh the page - the value should persist

### Rollback (if needed)
To remove the setting:
```sql
DELETE FROM settings WHERE key = 'monthly_due';
```

---

## 2. Status Constraint Update (`update_status_constraint.sql`)

### Purpose
**⚠️ RUN THIS FIRST** before using partial payments! This script updates the `status` column constraint in the `ledgers` table to allow the new `partial_paid` value.

### Error Without This Migration
```
ERROR: new row for relation "ledgers" violates check constraint "ledgers_status_check"
DETAIL: Failing row contains (..., partial_paid, ...)
```

### How to Run

#### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `update_status_constraint.sql`
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
6. Verify the output shows the updated constraint definition

### What This Script Does
- Drops the existing `ledgers_status_check` constraint
- Adds a new constraint that includes `'partial_paid'` as a valid status value
- Verifies the new constraint is in place
- Shows current status values in use

### After Running
The ledgers table will accept these status values:
- `'paid'`
- `'unpaid'`
- `'planned'`
- `'partial_paid'` ✓ NEW

---

## 3. Partial Payment Support Migration (`add_paid_amount_column.sql`)

### Purpose
This script adds the `paid_amount` column to the `ledgers` table to support partial payment tracking. This enables the system to track how much has been paid towards a debt when the full amount hasn't been paid yet.

### How to Run

#### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add_paid_amount_column.sql`
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
6. Verify the output shows the updated column structure

### What This Script Does
- Adds a `paid_amount` NUMERIC(10,2) column to the `ledgers` table if it doesn't exist
- Updates existing records with `status = 'paid'` to set `paid_amount = amount`
- Returns the last 10 ledger records to verify the changes
- Safe to run multiple times (idempotent)

### New Status: partial_paid
With this migration, the ledgers table now supports a new status:
- **paid**: Fully paid (paid_amount = amount)
- **unpaid**: Not paid at all (paid_amount = 0 or null)
- **partial_paid**: Partially paid (0 < paid_amount < amount)
- **planned**: Future/planned debt

### How Partial Payments Work

**Example 1: Initial Partial Payment**
- Monthly due: 300 TL
- Resident pays: 700 TL
- Result:
  - Month 1: 300 TL → status: 'paid', paid_amount: 300
  - Month 2: 300 TL → status: 'paid', paid_amount: 300
  - Month 3: 300 TL → status: 'partial_paid', paid_amount: 100

**Example 2: Completing a Partial Payment**
- Month 3 from above: amount: 300, paid_amount: 100, status: 'partial_paid'
- Resident pays: 500 TL
- Result:
  - Month 3: 300 TL → status: 'paid', paid_amount: 300 (completed)
  - Month 4: 300 TL → status: 'paid', paid_amount: 300
  - Month 5: 300 TL → status: 'partial_paid', paid_amount: 200

### After Running
The application will:
- Automatically track partial payments with the new `paid_amount` field
- Display partial payments with yellow status badge showing "Kısmi Ödendi"
- Show payment progress as "100 / 300 ₺" format
- Calculate total debt correctly including partial payments
- Process new payments by completing partial payments first

### Verification
After running the script, you can verify it worked by:
1. Check the ledgers table structure has the new `paid_amount` column
2. Make a partial payment through the UI
3. Verify the ledger shows the payment with yellow badge and correct amounts
4. Check that total debt calculation excludes the partially paid amount

### Rollback (if needed)
To remove the column:
```sql
ALTER TABLE ledgers DROP COLUMN IF EXISTS paid_amount;
```

**⚠️ Warning**: Rolling back will lose all partial payment tracking data!

---

## 4. Debt Start Date Setting (`add_debt_start_date_setting.sql`)

### Purpose
This script adds the `debt_start_date` setting to define when debt calculation should begin. Debts before this date will not be included in total debt calculations.

### How to Run

#### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add_debt_start_date_setting.sql`
5. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`

### What This Script Does
- Adds `debt_start_date` setting with default value `2024-01-01`
- Uses `ON CONFLICT DO NOTHING` for idempotency
- Returns the setting to verify it was added

### How It Works

**Example Scenario:**
- Debt start date set to: `2025-06-01`
- Resident has unpaid debts from: May, June, July
- Result: Only June and July debts are counted (May is before start date)

**Planning Behavior:**
- Planning starts from the **first day of the current month**
- If today is December 15, 2025, planning starts from December 1, 2025
- Continues until the meeting date

### After Running
The system will:
- Only calculate debts from the specified start date onwards
- Ignore any debts with dates before the start date
- Show debt planning starting from the current month's first day

### Verification
After running the script:
1. Go to Settings page as admin
2. You should see "Borç Hesaplama Başlangıç Tarihi" field
3. Set the date and save
4. Check Dashboard - debt calculations should respect this date

### Rollback (if needed)
To remove the setting:
```sql
DELETE FROM settings WHERE key = 'debt_start_date';
```
