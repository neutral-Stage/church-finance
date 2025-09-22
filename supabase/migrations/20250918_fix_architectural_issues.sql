-- Architectural Fixes Migration
-- This migration addresses critical structural issues identified in the comprehensive review

-- 1. Fix the fund_summary view to properly handle church access control
DROP VIEW IF EXISTS fund_summary;

-- Create improved fund_summary view with proper RLS integration
CREATE OR REPLACE VIEW fund_summary AS
SELECT
    f.id,
    f.name,
    f.current_balance,
    f.church_id,
    f.fund_type,
    f.is_active,
    f.created_at,
    f.target_amount,
    f.description,
    COALESCE(income_total.total, 0) as total_income,
    COALESCE(expense_total.total, 0) as total_expenses,
    COALESCE(offering_total.total, 0) as total_offerings
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
        fund_id,
        SUM(amount::numeric) as total
    FROM (
        SELECT
            f2.id as fund_id,
            CASE
                WHEN o.fund_allocations ? f2.name
                THEN (o.fund_allocations->>f2.name)::numeric
                ELSE 0
            END as amount
        FROM offerings o
        CROSS JOIN funds f2
        WHERE o.fund_allocations ? f2.name
    ) allocation_amounts
    WHERE amount > 0
    GROUP BY fund_id
) offering_total ON f.id = offering_total.fund_id
WHERE f.is_active = true;

-- Enable RLS on the view
ALTER VIEW fund_summary SET (security_invoker = true);

-- Grant proper permissions
GRANT SELECT ON fund_summary TO anon;
GRANT SELECT ON fund_summary TO authenticated;

-- 2. Fix bills table field name issue (vendor vs vendor_name)
-- Add vendor field as computed column for backward compatibility
ALTER TABLE bills ADD COLUMN IF NOT EXISTS vendor VARCHAR(255)
GENERATED ALWAYS AS (vendor_name) STORED;

-- 3. Fix church_id requirements for multi-church system
-- Make church_id NOT NULL where required
ALTER TABLE funds ALTER COLUMN church_id SET NOT NULL;

-- Add default church_id for any remaining null values
UPDATE funds SET church_id = (
    SELECT id FROM churches WHERE name = 'Main Church' LIMIT 1
) WHERE church_id IS NULL;

-- 4. Fix transaction table to include proper foreign key references
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS church_id UUID
REFERENCES churches(id) ON DELETE CASCADE;

-- Set church_id based on fund's church
UPDATE transactions SET church_id = (
    SELECT f.church_id
    FROM funds f
    WHERE f.id = transactions.fund_id
) WHERE church_id IS NULL;

-- Make church_id required for transactions
ALTER TABLE transactions ALTER COLUMN church_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_church ON transactions(church_id);

-- 5. Fix bills table church_id
ALTER TABLE bills ADD COLUMN IF NOT EXISTS church_id UUID
REFERENCES churches(id) ON DELETE CASCADE;

-- Set church_id based on fund's church
UPDATE bills SET church_id = (
    SELECT f.church_id
    FROM funds f
    WHERE f.id = bills.fund_id
) WHERE bills.church_id IS NULL AND bills.fund_id IS NOT NULL;

-- For bills without fund_id, use default church
UPDATE bills SET church_id = (
    SELECT id FROM churches WHERE name = 'Main Church' LIMIT 1
) WHERE bills.church_id IS NULL;

-- Make church_id required for bills
ALTER TABLE bills ALTER COLUMN church_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bills_church ON bills(church_id);

-- 6. Fix advances table church_id
ALTER TABLE advances ADD COLUMN IF NOT EXISTS church_id UUID
REFERENCES churches(id) ON DELETE CASCADE;

-- Set church_id based on fund's church
UPDATE advances SET church_id = (
    SELECT f.church_id
    FROM funds f
    WHERE f.id = advances.fund_id
) WHERE advances.church_id IS NULL;

-- Make church_id required for advances
ALTER TABLE advances ALTER COLUMN church_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_advances_church ON advances(church_id);

-- 7. Fix offerings table church_id
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS church_id UUID
REFERENCES churches(id) ON DELETE CASCADE;

-- Set default church for existing offerings
UPDATE offerings SET church_id = (
    SELECT id FROM churches WHERE name = 'Main Church' LIMIT 1
) WHERE church_id IS NULL;

-- Make church_id required for offerings
ALTER TABLE offerings ALTER COLUMN church_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_offerings_church ON offerings(church_id);

-- 8. Update RLS policies to fix "never" type issues
-- Drop overly restrictive policies and create more permissive ones

-- Fix funds policies
DROP POLICY IF EXISTS "Users can view funds from their churches" ON funds;
DROP POLICY IF EXISTS "Users with permissions can manage funds" ON funds;

CREATE POLICY "Users can view accessible funds" ON funds
    FOR SELECT USING (
        -- Allow access if user has any role in the fund's church
        church_id IN (
            SELECT ucr.church_id
            FROM user_church_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        )
        -- OR if user is super admin
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

CREATE POLICY "Users can manage funds with permissions" ON funds
    FOR ALL USING (
        -- Check specific permissions for the church
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = funds.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (
                r.name = 'super_admin'
                OR r.name = 'church_admin'
                OR (r.permissions->'funds'->>'create' = 'true')
                OR (r.permissions->'funds'->>'update' = 'true')
                OR (r.permissions->'funds'->>'delete' = 'true')
            )
        )
    );

-- Fix transactions policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;

CREATE POLICY "Users can view accessible transactions" ON transactions
    FOR SELECT USING (
        church_id IN (
            SELECT ucr.church_id
            FROM user_church_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

CREATE POLICY "Users can manage transactions with permissions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = transactions.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (
                r.name IN ('super_admin', 'church_admin', 'treasurer')
                OR (r.permissions->'transactions'->>'create' = 'true')
                OR (r.permissions->'transactions'->>'update' = 'true')
                OR (r.permissions->'transactions'->>'delete' = 'true')
            )
        )
    );

-- Fix bills policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON bills;
DROP POLICY IF EXISTS "Enable read access for all users" ON bills;

CREATE POLICY "Users can view accessible bills" ON bills
    FOR SELECT USING (
        church_id IN (
            SELECT ucr.church_id
            FROM user_church_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

CREATE POLICY "Users can manage bills with permissions" ON bills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = bills.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (
                r.name IN ('super_admin', 'church_admin', 'treasurer')
                OR (r.permissions->'bills'->>'create' = 'true')
                OR (r.permissions->'bills'->>'update' = 'true')
                OR (r.permissions->'bills'->>'delete' = 'true')
            )
        )
    );

-- 9. Create function to get user's current church context
CREATE OR REPLACE FUNCTION get_user_current_church(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    church_id UUID;
BEGIN
    -- Get the first active church for the user
    -- In a real app, this would check user preferences/session
    SELECT ucr.church_id INTO church_id
    FROM user_church_roles ucr
    WHERE ucr.user_id = p_user_id
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    ORDER BY ucr.granted_at ASC
    LIMIT 1;

    RETURN church_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add updated_at triggers for new church_id columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers where missing
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_bills_updated_at ON bills;
CREATE TRIGGER trigger_update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_current_church TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_church_roles_active_user ON user_church_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON roles USING gin(permissions);

-- Fix critical architectural issues: schema alignment, RLS policies, type safety, and church context