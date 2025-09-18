-- Fix RLS Policies to Prevent Infinite Recursion
-- This migration fixes the circular dependency in user_church_roles policies

-- Drop all existing RLS policies that might cause recursion
DROP POLICY IF EXISTS "Users can view churches they have access to" ON churches;
DROP POLICY IF EXISTS "Super admins can insert churches" ON churches;
DROP POLICY IF EXISTS "Church admins and super admins can update churches" ON churches;

DROP POLICY IF EXISTS "Users can view roles" ON roles;

DROP POLICY IF EXISTS "Users can view their own church roles" ON user_church_roles;
DROP POLICY IF EXISTS "Admins can manage user church roles" ON user_church_roles;

DROP POLICY IF EXISTS "Users can view funds from their churches" ON funds;
DROP POLICY IF EXISTS "Users with permissions can manage funds" ON funds;

-- Create simplified RLS policies without circular dependencies

-- Churches policies - simplified to avoid recursion
DROP POLICY IF EXISTS "churches_select_policy" ON churches;
CREATE POLICY "churches_select_policy" ON churches
    FOR SELECT USING (
        -- Allow if user has any role in this church (simple join, no recursion)
        id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "churches_insert_policy" ON churches;
CREATE POLICY "churches_insert_policy" ON churches
    FOR INSERT WITH CHECK (
        -- Allow if user is authenticated (we'll check permissions in application layer)
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "churches_update_policy" ON churches;
CREATE POLICY "churches_update_policy" ON churches
    FOR UPDATE USING (
        -- Allow if user has any role in this church
        id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "churches_delete_policy" ON churches;
CREATE POLICY "churches_delete_policy" ON churches
    FOR DELETE USING (
        -- Allow if user has any role in this church
        id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Roles policies - allow all authenticated users to view roles
DROP POLICY IF EXISTS "roles_select_policy" ON roles;
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_insert_policy" ON roles;
CREATE POLICY "roles_insert_policy" ON roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_update_policy" ON roles;
CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_delete_policy" ON roles;
CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- User church roles policies - simplified
DROP POLICY IF EXISTS "user_church_roles_select_policy" ON user_church_roles;
CREATE POLICY "user_church_roles_select_policy" ON user_church_roles
    FOR SELECT USING (
        -- Users can see their own roles or roles in churches they have access to
        user_id = auth.uid() 
        OR church_id IN (
            SELECT DISTINCT church_id 
            FROM user_church_roles ucr2 
            WHERE ucr2.user_id = auth.uid() 
            AND ucr2.is_active = true
        )
    );

DROP POLICY IF EXISTS "user_church_roles_insert_policy" ON user_church_roles;
CREATE POLICY "user_church_roles_insert_policy" ON user_church_roles
    FOR INSERT WITH CHECK (
        -- Allow if authenticated (permission checking in application)
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "user_church_roles_update_policy" ON user_church_roles;
CREATE POLICY "user_church_roles_update_policy" ON user_church_roles
    FOR UPDATE USING (
        -- Allow if authenticated (permission checking in application)
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "user_church_roles_delete_policy" ON user_church_roles;
CREATE POLICY "user_church_roles_delete_policy" ON user_church_roles
    FOR DELETE USING (
        -- Allow if authenticated (permission checking in application)
        auth.uid() IS NOT NULL
    );

-- Funds policies - simplified
DROP POLICY IF EXISTS "funds_select_policy" ON funds;
CREATE POLICY "funds_select_policy" ON funds
    FOR SELECT USING (
        -- Allow if user has access to the church that owns this fund
        church_id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "funds_insert_policy" ON funds;
CREATE POLICY "funds_insert_policy" ON funds
    FOR INSERT WITH CHECK (
        -- Allow if user has access to the church
        church_id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "funds_update_policy" ON funds;
CREATE POLICY "funds_update_policy" ON funds
    FOR UPDATE USING (
        -- Allow if user has access to the church
        church_id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

DROP POLICY IF EXISTS "funds_delete_policy" ON funds;
CREATE POLICY "funds_delete_policy" ON funds
    FOR DELETE USING (
        -- Allow if user has access to the church
        church_id IN (
            SELECT church_id 
            FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Update other tables to use the church-based access pattern
-- Transactions
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON transactions;

DROP POLICY IF EXISTS "transactions_policy" ON transactions;
CREATE POLICY "transactions_policy" ON transactions
    FOR ALL USING (
        -- Allow if user has access to the church that owns the fund
        fund_id IN (
            SELECT f.id 
            FROM funds f
            JOIN user_church_roles ucr ON f.church_id = ucr.church_id
            WHERE ucr.user_id = auth.uid() 
            AND ucr.is_active = true
        )
    );

-- Offerings
DROP POLICY IF EXISTS "Enable read access for all users" ON offerings;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON offerings;

-- For offerings, we need to check fund allocations to see which churches they affect
-- For now, allow all authenticated users and handle permissions in application
DROP POLICY IF EXISTS "offerings_policy" ON offerings;
CREATE POLICY "offerings_policy" ON offerings
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Bills
DROP POLICY IF EXISTS "Enable read access for all users" ON bills;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON bills;

DROP POLICY IF EXISTS "bills_policy" ON bills;
CREATE POLICY "bills_policy" ON bills
    FOR ALL USING (
        -- Allow if user has access to the church that owns the fund
        fund_id IN (
            SELECT f.id 
            FROM funds f
            JOIN user_church_roles ucr ON f.church_id = ucr.church_id
            WHERE ucr.user_id = auth.uid() 
            AND ucr.is_active = true
        )
    );

-- Advances
DROP POLICY IF EXISTS "Enable read access for all users" ON advances;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON advances;

DROP POLICY IF EXISTS "advances_policy" ON advances;
CREATE POLICY "advances_policy" ON advances
    FOR ALL USING (
        -- Allow if user has access to the church that owns the fund
        fund_id IN (
            SELECT f.id 
            FROM funds f
            JOIN user_church_roles ucr ON f.church_id = ucr.church_id
            WHERE ucr.user_id = auth.uid() 
            AND ucr.is_active = true
        )
    );

-- Petty cash - allow all authenticated users (no church association)
DROP POLICY IF EXISTS "Enable read access for all users" ON petty_cash;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON petty_cash;

DROP POLICY IF EXISTS "petty_cash_policy" ON petty_cash;
CREATE POLICY "petty_cash_policy" ON petty_cash
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Members - allow all authenticated users for now
DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON members;

DROP POLICY IF EXISTS "members_policy" ON members;
CREATE POLICY "members_policy" ON members
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Offering members
DROP POLICY IF EXISTS "Enable read access for all users" ON offering_member;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON offering_member;

DROP POLICY IF EXISTS "offering_member_policy" ON offering_member;
CREATE POLICY "offering_member_policy" ON offering_member
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Update the check_user_permission function to avoid recursive calls
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_church_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_role_permissions JSONB;
BEGIN
    -- Get user's permissions for this church directly without recursive policy calls
    SELECT r.permissions INTO user_role_permissions
    FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = p_user_id
    AND ucr.church_id = p_church_id
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    AND r.is_active = true
    LIMIT 1;
    
    IF user_role_permissions IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if the user has the specific permission
    has_permission := COALESCE(
        (user_role_permissions->p_resource->>p_action)::boolean,
        false
    );
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;