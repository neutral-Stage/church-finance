-- Add permission check function to support API routes (FIXED VERSION)
-- This migration adds utility functions for checking user permissions
-- Handles existing function conflicts by dropping first

-- Drop existing functions if they exist (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS check_user_permission CASCADE;
DROP FUNCTION IF EXISTS get_user_role_in_church CASCADE;
DROP FUNCTION IF EXISTS is_super_admin CASCADE;

-- Function to check if a user has permission for a specific action on a resource in a church
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_church_id UUID,
    p_resource TEXT,
    p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_name TEXT;
    user_permissions JSONB;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Get user's role in the church
    SELECT r.name, r.permissions
    INTO user_role_name, user_permissions
    FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = p_user_id
    AND ucr.church_id = p_church_id
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    LIMIT 1;

    -- If no role found, check for super admin across all churches
    IF user_role_name IS NULL THEN
        SELECT r.name, r.permissions
        INTO user_role_name, user_permissions
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND r.name = 'super_admin'
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        LIMIT 1;
    END IF;

    -- Check permissions
    IF user_role_name IS NOT NULL THEN
        -- Super admin has all permissions
        IF user_role_name = 'super_admin' THEN
            has_permission := TRUE;
        -- Church admin has most permissions in their church
        ELSIF user_role_name = 'church_admin' THEN
            has_permission := TRUE;
        -- Check specific permissions in the role
        ELSIF user_permissions IS NOT NULL THEN
            has_permission := COALESCE(
                (user_permissions->p_resource->>p_action)::BOOLEAN,
                FALSE
            );
        END IF;
    END IF;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a specific church
CREATE OR REPLACE FUNCTION get_user_role_in_church(
    p_user_id UUID,
    p_church_id UUID
) RETURNS TABLE (
    role_name TEXT,
    role_display_name TEXT,
    permissions JSONB,
    is_active BOOLEAN,
    granted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.name,
        r.display_name,
        r.permissions,
        ucr.is_active,
        ucr.granted_at,
        ucr.expires_at
    FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = p_user_id
    AND ucr.church_id = p_church_id
    ORDER BY ucr.granted_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND r.name = 'super_admin'
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    ) INTO is_admin;

    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_in_church TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- Create indexes to optimize permission checks
CREATE INDEX IF NOT EXISTS idx_user_church_roles_user_church_active
ON user_church_roles(user_id, church_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_church_roles_expires
ON user_church_roles(expires_at)
WHERE expires_at IS NOT NULL;

-- Add helpful comments
COMMENT ON FUNCTION check_user_permission IS 'Check if a user has specific permissions for a resource in a church';
COMMENT ON FUNCTION get_user_role_in_church IS 'Get user role details for a specific church';
COMMENT ON FUNCTION is_super_admin IS 'Check if user has super admin privileges';