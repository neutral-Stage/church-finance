-- Fix RLS Policies for Proper Church-Based Data Isolation
-- This migration addresses critical security gaps and re-enables RLS with strict church-based policies
-- Date: 2025-09-24

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- STEP 1: Add missing church_id columns to tables that need church context
-- =====================================================================================

-- Add church_id to petty_cash table
ALTER TABLE petty_cash ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Add church_id to notifications table for church-specific financial notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Add church_id to ledger_entries table
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Create indexes for new church_id columns
CREATE INDEX IF NOT EXISTS idx_petty_cash_church ON petty_cash(church_id);
CREATE INDEX IF NOT EXISTS idx_notifications_church ON notifications(church_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_church ON ledger_entries(church_id);

-- Update existing records to belong to default church
DO $$
DECLARE
    default_church_id UUID;
BEGIN
    SELECT id INTO default_church_id FROM churches WHERE name = 'Main Church' LIMIT 1;

    -- If default church doesn't exist, create it
    IF default_church_id IS NULL THEN
        INSERT INTO churches (name, type, description, is_active)
        VALUES ('Main Church', 'church', 'Default church for existing data', true)
        RETURNING id INTO default_church_id;
    END IF;

    -- Update existing records to belong to the default church
    UPDATE petty_cash SET church_id = default_church_id WHERE church_id IS NULL;
    UPDATE ledger_entries SET church_id = default_church_id WHERE church_id IS NULL;
    -- Note: notifications can remain NULL for user-specific notifications
END $$;

-- Make church_id NOT NULL for critical tables
ALTER TABLE petty_cash ALTER COLUMN church_id SET NOT NULL;
ALTER TABLE ledger_entries ALTER COLUMN church_id SET NOT NULL;

-- =====================================================================================
-- STEP 2: Create optimized helper function for church access checks (prevents recursion)
-- =====================================================================================

-- Drop existing problematic function
DROP FUNCTION IF EXISTS check_user_permission(UUID, UUID, VARCHAR, VARCHAR);

-- Create optimized function that directly queries without RLS to prevent recursion
CREATE OR REPLACE FUNCTION user_has_church_access(p_user_id UUID, p_church_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    -- Direct query without RLS to prevent recursion
    SELECT EXISTS (
        SELECT 1
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND ucr.church_id = p_church_id
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        AND r.is_active = true
    ) INTO has_access;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION user_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_super_admin BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND r.name = 'super_admin'
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        AND r.is_active = true
    ) INTO is_super_admin;

    RETURN is_super_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check specific permissions
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_church_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND ucr.church_id = p_church_id
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        AND r.is_active = true
        AND (
            r.name = 'super_admin'
            OR (r.permissions->p_resource->>p_action)::boolean = true
        )
    ) INTO has_permission;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- STEP 3: Re-enable RLS and create strict policies
-- =====================================================================================

-- Re-enable RLS on all critical tables
ALTER TABLE user_church_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- STEP 4: Create strict church-based RLS policies
-- =====================================================================================

-- === CHURCHES TABLE ===
-- Drop existing policies and create new ones
DROP POLICY IF EXISTS "churches_select_policy" ON churches;
DROP POLICY IF EXISTS "churches_insert_policy" ON churches;
DROP POLICY IF EXISTS "churches_update_policy" ON churches;
DROP POLICY IF EXISTS "churches_delete_policy" ON churches;
DROP POLICY IF EXISTS "Users can view churches they have access to" ON churches;
DROP POLICY IF EXISTS "Super admins can insert churches" ON churches;
DROP POLICY IF EXISTS "Church admins and super admins can update churches" ON churches;

CREATE POLICY "churches_select_policy" ON churches
    FOR SELECT USING (
        user_has_church_access(auth.uid(), id) OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "churches_insert_policy" ON churches
    FOR INSERT WITH CHECK (user_is_super_admin(auth.uid()));

CREATE POLICY "churches_update_policy" ON churches
    FOR UPDATE USING (
        user_has_permission(auth.uid(), id, 'churches', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "churches_delete_policy" ON churches
    FOR DELETE USING (user_is_super_admin(auth.uid()));

-- === USER_CHURCH_ROLES TABLE ===
DROP POLICY IF EXISTS "user_church_roles_select_policy" ON user_church_roles;
DROP POLICY IF EXISTS "user_church_roles_insert_policy" ON user_church_roles;
DROP POLICY IF EXISTS "user_church_roles_update_policy" ON user_church_roles;
DROP POLICY IF EXISTS "user_church_roles_delete_policy" ON user_church_roles;
DROP POLICY IF EXISTS "Users can view their own church roles" ON user_church_roles;
DROP POLICY IF EXISTS "Admins can manage user church roles" ON user_church_roles;

CREATE POLICY "user_church_roles_select_policy" ON user_church_roles
    FOR SELECT USING (
        user_id = auth.uid() -- Users can see their own roles
        OR user_has_permission(auth.uid(), church_id, 'users', 'read') -- Admins can see church roles
        OR user_is_super_admin(auth.uid()) -- Super admins see all
    );

CREATE POLICY "user_church_roles_insert_policy" ON user_church_roles
    FOR INSERT WITH CHECK (
        user_has_permission(auth.uid(), church_id, 'users', 'create')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "user_church_roles_update_policy" ON user_church_roles
    FOR UPDATE USING (
        user_has_permission(auth.uid(), church_id, 'users', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "user_church_roles_delete_policy" ON user_church_roles
    FOR DELETE USING (
        user_has_permission(auth.uid(), church_id, 'users', 'delete')
        OR user_is_super_admin(auth.uid())
    );

-- === FUNDS TABLE ===
DROP POLICY IF EXISTS "funds_select_policy" ON funds;
DROP POLICY IF EXISTS "funds_insert_policy" ON funds;
DROP POLICY IF EXISTS "funds_update_policy" ON funds;
DROP POLICY IF EXISTS "funds_delete_policy" ON funds;
DROP POLICY IF EXISTS "Users can view funds from their churches" ON funds;
DROP POLICY IF EXISTS "Users with permissions can manage funds" ON funds;

CREATE POLICY "funds_select_policy" ON funds
    FOR SELECT USING (
        user_has_church_access(auth.uid(), church_id) OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "funds_insert_policy" ON funds
    FOR INSERT WITH CHECK (
        user_has_permission(auth.uid(), church_id, 'funds', 'create')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "funds_update_policy" ON funds
    FOR UPDATE USING (
        user_has_permission(auth.uid(), church_id, 'funds', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "funds_delete_policy" ON funds
    FOR DELETE USING (
        user_has_permission(auth.uid(), church_id, 'funds', 'delete')
        OR user_is_super_admin(auth.uid())
    );

-- === TRANSACTIONS TABLE ===
DROP POLICY IF EXISTS "transactions_policy" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON transactions;

CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (user_has_church_access(auth.uid(), f.church_id) OR user_is_super_admin(auth.uid()))
        )
    );

CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'transactions', 'create')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "transactions_update_policy" ON transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'transactions', 'update')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "transactions_delete_policy" ON transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'transactions', 'delete')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

-- === BILLS TABLE ===
DROP POLICY IF EXISTS "bills_policy" ON bills;
DROP POLICY IF EXISTS "Enable read access for all users" ON bills;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON bills;

CREATE POLICY "bills_select_policy" ON bills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (user_has_church_access(auth.uid(), f.church_id) OR user_is_super_admin(auth.uid()))
        )
    );

CREATE POLICY "bills_insert_policy" ON bills
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'bills', 'create')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "bills_update_policy" ON bills
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'bills', 'update')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "bills_delete_policy" ON bills
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'bills', 'delete')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

-- === ADVANCES TABLE ===
DROP POLICY IF EXISTS "advances_policy" ON advances;
DROP POLICY IF EXISTS "Enable read access for all users" ON advances;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON advances;

CREATE POLICY "advances_select_policy" ON advances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (user_has_church_access(auth.uid(), f.church_id) OR user_is_super_admin(auth.uid()))
        )
    );

CREATE POLICY "advances_insert_policy" ON advances
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'advances', 'create')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "advances_update_policy" ON advances
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'advances', 'update')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

CREATE POLICY "advances_delete_policy" ON advances
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND (
                user_has_permission(auth.uid(), f.church_id, 'advances', 'delete')
                OR user_is_super_admin(auth.uid())
            )
        )
    );

-- === PETTY_CASH TABLE ===
DROP POLICY IF EXISTS "petty_cash_policy" ON petty_cash;
DROP POLICY IF EXISTS "Enable read access for all users" ON petty_cash;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON petty_cash;

CREATE POLICY "petty_cash_select_policy" ON petty_cash
    FOR SELECT USING (
        user_has_church_access(auth.uid(), church_id) OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "petty_cash_insert_policy" ON petty_cash
    FOR INSERT WITH CHECK (
        user_has_permission(auth.uid(), church_id, 'transactions', 'create')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "petty_cash_update_policy" ON petty_cash
    FOR UPDATE USING (
        user_has_permission(auth.uid(), church_id, 'transactions', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "petty_cash_delete_policy" ON petty_cash
    FOR DELETE USING (
        user_has_permission(auth.uid(), church_id, 'transactions', 'delete')
        OR user_is_super_admin(auth.uid())
    );

-- === OFFERINGS TABLE ===
-- For offerings, we need to check fund allocations to determine church access
DROP POLICY IF EXISTS "offerings_policy" ON offerings;
DROP POLICY IF EXISTS "Enable read access for all users" ON offerings;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON offerings;

CREATE POLICY "offerings_select_policy" ON offerings
    FOR SELECT USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.name = ANY(SELECT jsonb_object_keys(fund_allocations))
            AND (user_has_church_access(auth.uid(), f.church_id))
        )
    );

CREATE POLICY "offerings_insert_policy" ON offerings
    FOR INSERT WITH CHECK (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.name = ANY(SELECT jsonb_object_keys(fund_allocations))
            AND user_has_permission(auth.uid(), f.church_id, 'offerings', 'create')
        )
    );

CREATE POLICY "offerings_update_policy" ON offerings
    FOR UPDATE USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.name = ANY(SELECT jsonb_object_keys(fund_allocations))
            AND user_has_permission(auth.uid(), f.church_id, 'offerings', 'update')
        )
    );

CREATE POLICY "offerings_delete_policy" ON offerings
    FOR DELETE USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.name = ANY(SELECT jsonb_object_keys(fund_allocations))
            AND user_has_permission(auth.uid(), f.church_id, 'offerings', 'delete')
        )
    );

-- === MEMBERS TABLE ===
-- Members policies were already created in previous migration, but let's ensure they're correct
DROP POLICY IF EXISTS "members_policy" ON members;
DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can view members from their churches" ON members;
DROP POLICY IF EXISTS "Users with permissions can manage members" ON members;

CREATE POLICY "members_select_policy" ON members
    FOR SELECT USING (
        user_has_church_access(auth.uid(), church_id) OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "members_insert_policy" ON members
    FOR INSERT WITH CHECK (
        user_has_permission(auth.uid(), church_id, 'members', 'create')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "members_update_policy" ON members
    FOR UPDATE USING (
        user_has_permission(auth.uid(), church_id, 'members', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "members_delete_policy" ON members
    FOR DELETE USING (
        user_has_permission(auth.uid(), church_id, 'members', 'delete')
        OR user_is_super_admin(auth.uid())
    );

-- === OFFERING_MEMBER TABLE ===
DROP POLICY IF EXISTS "offering_member_policy" ON offering_member;
DROP POLICY IF EXISTS "Enable read access for all users" ON offering_member;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON offering_member;

CREATE POLICY "offering_member_select_policy" ON offering_member
    FOR SELECT USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM members m
            WHERE m.id = member_id
            AND (user_has_church_access(auth.uid(), m.church_id))
        )
    );

CREATE POLICY "offering_member_insert_policy" ON offering_member
    FOR INSERT WITH CHECK (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM members m
            WHERE m.id = member_id
            AND user_has_permission(auth.uid(), m.church_id, 'offerings', 'create')
        )
    );

CREATE POLICY "offering_member_update_policy" ON offering_member
    FOR UPDATE USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM members m
            WHERE m.id = member_id
            AND user_has_permission(auth.uid(), m.church_id, 'offerings', 'update')
        )
    );

CREATE POLICY "offering_member_delete_policy" ON offering_member
    FOR DELETE USING (
        user_is_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM members m
            WHERE m.id = member_id
            AND user_has_permission(auth.uid(), m.church_id, 'offerings', 'delete')
        )
    );

-- === NOTIFICATIONS TABLE ===
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications for any user" ON notifications;

-- Users can view their own notifications, plus church-specific notifications
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (
        user_id = auth.uid() -- Own notifications
        OR (
            church_id IS NOT NULL -- Church-specific notifications
            AND (user_has_church_access(auth.uid(), church_id) OR user_is_super_admin(auth.uid()))
        )
    );

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy" ON notifications
    FOR DELETE USING (user_id = auth.uid());

-- Allow system/functions to insert notifications
CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT WITH CHECK (true);

-- === LEDGER_ENTRIES TABLE ===
DROP POLICY IF EXISTS "Users can view all ledger entries" ON ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can insert ledger entries" ON ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can update ledger entries" ON ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can delete ledger entries" ON ledger_entries;

CREATE POLICY "ledger_entries_select_policy" ON ledger_entries
    FOR SELECT USING (
        user_has_church_access(auth.uid(), church_id) OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "ledger_entries_insert_policy" ON ledger_entries
    FOR INSERT WITH CHECK (
        user_has_permission(auth.uid(), church_id, 'bills', 'create')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "ledger_entries_update_policy" ON ledger_entries
    FOR UPDATE USING (
        user_has_permission(auth.uid(), church_id, 'bills', 'update')
        OR user_is_super_admin(auth.uid())
    );

CREATE POLICY "ledger_entries_delete_policy" ON ledger_entries
    FOR DELETE USING (
        user_has_permission(auth.uid(), church_id, 'bills', 'delete')
        OR user_is_super_admin(auth.uid())
    );

-- =====================================================================================
-- STEP 5: Update notification functions to be church-aware
-- =====================================================================================

-- Update bill notification function to set church_id
CREATE OR REPLACE FUNCTION generate_bill_due_notifications()
RETURNS void AS $$
DECLARE
    bill_record RECORD;
    days_until_due INTEGER;
    target_church_id UUID;
BEGIN
    -- Generate notifications for bills due within 7 days
    FOR bill_record IN
        SELECT b.id, b.vendor_name, b.amount, b.due_date, b.status, f.church_id
        FROM bills b
        JOIN funds f ON b.fund_id = f.id
        WHERE b.status IN ('pending', 'overdue')
        AND b.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    LOOP
        days_until_due := (bill_record.due_date - CURRENT_DATE);
        target_church_id := bill_record.church_id;

        -- Insert church-specific notification for users with access to this church
        INSERT INTO notifications (user_id, church_id, title, message, type, category, action_url, metadata)
        SELECT
            ucr.user_id,
            target_church_id,
            CASE
                WHEN days_until_due = 0 THEN 'Bill Due Today'
                WHEN days_until_due = 1 THEN 'Bill Due Tomorrow'
                WHEN days_until_due < 0 THEN 'Overdue Bill'
                ELSE 'Bill Due Soon'
            END,
            CASE
                WHEN days_until_due = 0 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due today'
                WHEN days_until_due = 1 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due tomorrow'
                WHEN days_until_due < 0 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is overdue by ' || ABS(days_until_due) || ' days'
                ELSE bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due in ' || days_until_due || ' days'
            END,
            CASE
                WHEN days_until_due < 0 THEN 'error'
                WHEN days_until_due <= 1 THEN 'warning'
                ELSE 'info'
            END,
            'bill',
            '/bills?id=' || bill_record.id,
            jsonb_build_object('bill_id', bill_record.id, 'amount', bill_record.amount, 'due_date', bill_record.due_date)
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.church_id = target_church_id
        AND ucr.is_active = true
        AND (r.permissions->'bills'->>'read')::boolean = true
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.category = 'bill'
            AND n.metadata->>'bill_id' = bill_record.id::text
            AND n.user_id = ucr.user_id
            AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- STEP 6: Create view for secure fund summary with church context
-- =====================================================================================

-- Drop and recreate fund_summary view with church-aware filtering
DROP VIEW IF EXISTS fund_summary;

CREATE OR REPLACE VIEW fund_summary AS
SELECT
    f.id,
    f.name,
    f.current_balance,
    f.church_id,
    f.fund_type,
    f.is_active,
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
) offering_total ON f.id = offering_total.fund_id
WHERE f.is_active = true
AND (
    user_has_church_access(auth.uid(), f.church_id)
    OR user_is_super_admin(auth.uid())
);

-- =====================================================================================
-- STEP 7: Final cleanup and verification
-- =====================================================================================

-- Update roles policies to be more restrictive
DROP POLICY IF EXISTS "roles_select_policy" ON roles;
DROP POLICY IF EXISTS "roles_insert_policy" ON roles;
DROP POLICY IF EXISTS "roles_update_policy" ON roles;
DROP POLICY IF EXISTS "roles_delete_policy" ON roles;
DROP POLICY IF EXISTS "Users can view roles" ON roles;

-- All authenticated users can view roles (needed for role assignment UI)
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only super admins can manage system roles
CREATE POLICY "roles_insert_policy" ON roles
    FOR INSERT WITH CHECK (user_is_super_admin(auth.uid()));

CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (user_is_super_admin(auth.uid()));

CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (user_is_super_admin(auth.uid()) AND NOT is_system_role);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION user_has_church_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, UUID, VARCHAR, VARCHAR) TO authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_church_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_church_roles_lookup ON user_church_roles(user_id, church_id)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_church_roles_admin_lookup ON user_church_roles(user_id, role_id)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON roles USING GIN(permissions)
    WHERE is_active = true;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- Add comment documenting the security improvements
COMMENT ON FUNCTION user_has_church_access(UUID, UUID) IS
'Optimized function to check if user has access to a church without causing RLS recursion. Used internally by RLS policies.';

COMMENT ON FUNCTION user_is_super_admin(UUID) IS
'Optimized function to check if user is super admin without causing RLS recursion. Used internally by RLS policies.';

COMMENT ON FUNCTION user_has_permission(UUID, UUID, VARCHAR, VARCHAR) IS
'Optimized function to check specific user permissions for a church resource without causing RLS recursion. Used internally by RLS policies.';

-- Create migrations_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT
);

-- Log successful migration
INSERT INTO migrations_log (migration_name, executed_at, description)
VALUES (
    '20250924_fix_rls_church_isolation_security',
    NOW(),
    'Fixed RLS policies for proper church-based data isolation. Added church_id to missing tables, created optimized helper functions, and implemented strict church-based policies on all tables.'
) ON CONFLICT (migration_name) DO NOTHING;