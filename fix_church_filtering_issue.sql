-- DEFINITIVE FIX: Church-Based Data Filtering Issue
-- Root Cause: Conflicting RLS policies and application-level filtering
-- Solution: Simplify to RLS-only approach with proper session context

-- =====================================================================================
-- STEP 1: Fix RLS Functions to be Context-Aware
-- =====================================================================================

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS user_has_church_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_is_super_admin(UUID);
DROP FUNCTION IF EXISTS user_has_permission(UUID, UUID, VARCHAR, VARCHAR);

-- Create simplified, non-recursive functions
CREATE OR REPLACE FUNCTION get_current_user_church_access()
RETURNS TABLE(church_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT ucr.church_id
    FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    AND r.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = auth.uid()
        AND r.name = 'super_admin'
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        AND r.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================================================
-- STEP 2: Update RLS Policies to Use Simplified Logic
-- =====================================================================================

-- === FUNDS TABLE ===
DROP POLICY IF EXISTS "funds_select_policy" ON funds;
DROP POLICY IF EXISTS "funds_insert_policy" ON funds;
DROP POLICY IF EXISTS "funds_update_policy" ON funds;
DROP POLICY IF EXISTS "funds_delete_policy" ON funds;

CREATE POLICY "funds_select_policy" ON funds
    FOR SELECT USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "funds_insert_policy" ON funds
    FOR INSERT WITH CHECK (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "funds_update_policy" ON funds
    FOR UPDATE USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "funds_delete_policy" ON funds
    FOR DELETE USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

-- === TRANSACTIONS TABLE ===
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;

CREATE POLICY "transactions_select_policy" ON transactions
    FOR SELECT USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "transactions_insert_policy" ON transactions
    FOR INSERT WITH CHECK (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "transactions_update_policy" ON transactions
    FOR UPDATE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "transactions_delete_policy" ON transactions
    FOR DELETE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

-- === BILLS TABLE ===
DROP POLICY IF EXISTS "bills_select_policy" ON bills;
DROP POLICY IF EXISTS "bills_insert_policy" ON bills;
DROP POLICY IF EXISTS "bills_update_policy" ON bills;
DROP POLICY IF EXISTS "bills_delete_policy" ON bills;

CREATE POLICY "bills_select_policy" ON bills
    FOR SELECT USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "bills_insert_policy" ON bills
    FOR INSERT WITH CHECK (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "bills_update_policy" ON bills
    FOR UPDATE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "bills_delete_policy" ON bills
    FOR DELETE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

-- === ADVANCES TABLE ===
DROP POLICY IF EXISTS "advances_select_policy" ON advances;
DROP POLICY IF EXISTS "advances_insert_policy" ON advances;
DROP POLICY IF EXISTS "advances_update_policy" ON advances;
DROP POLICY IF EXISTS "advances_delete_policy" ON advances;

CREATE POLICY "advances_select_policy" ON advances
    FOR SELECT USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "advances_insert_policy" ON advances
    FOR INSERT WITH CHECK (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "advances_update_policy" ON advances
    FOR UPDATE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

CREATE POLICY "advances_delete_policy" ON advances
    FOR DELETE USING (
        current_user_is_super_admin()
        OR EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = fund_id
            AND f.church_id IN (SELECT * FROM get_current_user_church_access())
        )
    );

-- === MEMBERS TABLE ===
DROP POLICY IF EXISTS "members_select_policy" ON members;
DROP POLICY IF EXISTS "members_insert_policy" ON members;
DROP POLICY IF EXISTS "members_update_policy" ON members;
DROP POLICY IF EXISTS "members_delete_policy" ON members;

CREATE POLICY "members_select_policy" ON members
    FOR SELECT USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "members_insert_policy" ON members
    FOR INSERT WITH CHECK (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "members_update_policy" ON members
    FOR UPDATE USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

CREATE POLICY "members_delete_policy" ON members
    FOR DELETE USING (
        current_user_is_super_admin()
        OR church_id IN (SELECT * FROM get_current_user_church_access())
    );

-- =====================================================================================
-- STEP 3: Ensure RLS is enabled on all tables
-- =====================================================================================
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_church_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- STEP 4: Grant necessary permissions
-- =====================================================================================
GRANT EXECUTE ON FUNCTION get_current_user_church_access() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_super_admin() TO authenticated;

-- =====================================================================================
-- STEP 5: Create debugging functions
-- =====================================================================================
CREATE OR REPLACE FUNCTION debug_user_church_access()
RETURNS TABLE (
    user_id UUID,
    church_id UUID,
    church_name VARCHAR,
    role_name VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        auth.uid() as user_id,
        ucr.church_id,
        c.name as church_name,
        r.name as role_name,
        ucr.is_active
    FROM user_church_roles ucr
    JOIN churches c ON ucr.church_id = c.id
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = auth.uid()
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_user_church_access() TO authenticated;

-- =====================================================================================
-- Migration log
-- =====================================================================================
INSERT INTO migrations_log (migration_name, executed_at, description)
VALUES (
    'fix_church_filtering_issue',
    NOW(),
    'Fixed church-based data filtering by removing double-filtering conflicts between RLS and application-level filters. Simplified RLS policies to use stable, non-recursive functions.'
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = NOW(),
    description = 'Fixed church-based data filtering by removing double-filtering conflicts between RLS and application-level filters. Simplified RLS policies to use stable, non-recursive functions.';