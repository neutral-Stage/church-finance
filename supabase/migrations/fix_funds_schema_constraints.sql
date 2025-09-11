-- Fix funds table to allow flexible fund creation
-- Remove the restrictive name constraint and add fund_type, target_amount, created_by fields

-- First, drop the view that depends on the funds.name column
DROP VIEW IF EXISTS fund_summary;

-- Drop the existing name constraint
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_name_check;

-- Add fund_type column for categorization
ALTER TABLE funds ADD COLUMN IF NOT EXISTS fund_type VARCHAR(100);

-- Add target_amount column for fund goals
ALTER TABLE funds ADD COLUMN IF NOT EXISTS target_amount DECIMAL(12,2);

-- Add created_by column to track who created the fund
ALTER TABLE funds ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update the name column to allow any text (remove the restrictive constraint)
ALTER TABLE funds ALTER COLUMN name TYPE VARCHAR(255);

-- Create index for fund_type
CREATE INDEX IF NOT EXISTS idx_funds_type ON funds(fund_type);

-- Update existing funds with default fund_type if needed
UPDATE funds SET fund_type = 
  CASE 
    WHEN name = 'Management' THEN 'Management Fund'
    WHEN name = 'Mission' THEN 'Mission Fund' 
    WHEN name = 'Building' THEN 'Building Fund'
    ELSE 'Management Fund'
  END
WHERE fund_type IS NULL;

-- Update description to be optional (nullable) since API expects it to be optional
ALTER TABLE funds ALTER COLUMN description DROP NOT NULL;

-- Recreate the fund_summary view
CREATE VIEW fund_summary AS
SELECT 
    f.id,
    f.name,
    f.current_balance,
    f.fund_type,
    f.target_amount,
    f.description,
    COALESCE(income_total.total, 0) as total_income,
    COALESCE(expense_total.total, 0) as total_expenses,
    COALESCE(offering_total.total, 0) as total_offerings,
    f.created_at
FROM funds f
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'income'
    GROUP BY fund_id
) income_total ON f.id = income_total.fund_id
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'expense'
    GROUP BY fund_id
) expense_total ON f.id = expense_total.fund_id
LEFT JOIN (
    SELECT 
        f2.id as fund_id,
        SUM((o.fund_allocations->>f2.name)::numeric) as total
    FROM offerings o
    CROSS JOIN funds f2
    WHERE o.fund_allocations ? f2.name
    GROUP BY f2.id
) offering_total ON f.id = offering_total.fund_id;

-- Grant access to the recreated view
GRANT SELECT ON fund_summary TO anon;
GRANT SELECT ON fund_summary TO authenticated;