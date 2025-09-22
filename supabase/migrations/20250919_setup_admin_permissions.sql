-- Migration to set up admin permissions and roles
-- This ensures the permission system works correctly

-- First, ensure default roles exist with proper permissions
INSERT INTO roles (name, display_name, description, is_system_role, permissions, is_active) VALUES
(
  'super_admin',
  'Super Administrator',
  'Full system access across all churches',
  true,
  '{
    "admin": {
      "global": true,
      "churches": {"read": true, "create": true, "update": true, "delete": true},
      "users": {"read": true, "create": true, "update": true, "delete": true},
      "roles": {"read": true, "create": true, "update": true, "delete": true}
    },
    "funds": {"read": true, "create": true, "update": true, "delete": true},
    "transactions": {"read": true, "create": true, "update": true, "delete": true},
    "offerings": {"read": true, "create": true, "update": true, "delete": true},
    "bills": {"read": true, "create": true, "update": true, "delete": true},
    "advances": {"read": true, "create": true, "update": true, "delete": true}
  }'::jsonb,
  true
) ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = true,
  updated_at = NOW();

INSERT INTO roles (name, display_name, description, is_system_role, permissions, is_active) VALUES
(
  'church_admin',
  'Church Administrator',
  'Full administrative access to assigned churches',
  true,
  '{
    "admin": {
      "churches": {"read": true, "update": true}
    },
    "funds": {"read": true, "create": true, "update": true, "delete": true},
    "transactions": {"read": true, "create": true, "update": true, "delete": true},
    "offerings": {"read": true, "create": true, "update": true, "delete": true},
    "bills": {"read": true, "create": true, "update": true, "delete": true},
    "advances": {"read": true, "create": true, "update": true, "delete": true}
  }'::jsonb,
  true
) ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = true,
  updated_at = NOW();

INSERT INTO roles (name, display_name, description, is_system_role, permissions, is_active) VALUES
(
  'treasurer',
  'Treasurer',
  'Financial management and transaction access',
  true,
  '{
    "funds": {"read": true, "update": true},
    "transactions": {"read": true, "create": true, "update": true},
    "offerings": {"read": true, "create": true, "update": true},
    "bills": {"read": true, "create": true, "update": true},
    "advances": {"read": true, "create": true, "update": true}
  }'::jsonb,
  true
) ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = true,
  updated_at = NOW();

INSERT INTO roles (name, display_name, description, is_system_role, permissions, is_active) VALUES
(
  'member',
  'Member',
  'Standard member access with offering capabilities',
  true,
  '{
    "funds": {"read": true},
    "transactions": {"read": true},
    "offerings": {"read": true, "create": true}
  }'::jsonb,
  true
) ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = true,
  updated_at = NOW();

INSERT INTO roles (name, display_name, description, is_system_role, permissions, is_active) VALUES
(
  'viewer',
  'Viewer',
  'Read-only access to financial information',
  true,
  '{
    "funds": {"read": true},
    "transactions": {"read": true},
    "offerings": {"read": true}
  }'::jsonb,
  true
) ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  is_active = true,
  updated_at = NOW();

-- Migrate users with legacy 'admin' or 'super_admin' roles to the new system
-- Find users with admin-level roles who don't have church roles yet
DO $$
DECLARE
  admin_user_id UUID;
  super_admin_role_id UUID;
  default_church_id UUID;
BEGIN
  -- Get the super_admin role ID
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';

  -- Get a default church ID (or create one if none exists)
  SELECT id INTO default_church_id FROM churches LIMIT 1;

  -- If no church exists, create a default one
  IF default_church_id IS NULL THEN
    INSERT INTO churches (name, type, is_active, description)
    VALUES ('Main Church', 'church', true, 'Default church for the system')
    RETURNING id INTO default_church_id;
  END IF;

  -- Migrate users with admin or super_admin role in the users table
  FOR admin_user_id IN
    SELECT id FROM users
    WHERE role IN ('admin', 'super_admin')
    AND NOT EXISTS (
      SELECT 1 FROM user_church_roles ucr
      JOIN roles r ON ucr.role_id = r.id
      WHERE ucr.user_id = users.id
      AND r.name = 'super_admin'
      AND ucr.is_active = true
    )
  LOOP
    -- Create user_church_role record for super admin access
    INSERT INTO user_church_roles (user_id, church_id, role_id, is_active, granted_at)
    VALUES (admin_user_id, NULL, super_admin_role_id, true, NOW())
    ON CONFLICT (user_id, church_id, role_id) DO NOTHING;

    RAISE NOTICE 'Migrated user % to super_admin role', admin_user_id;
  END LOOP;

  -- If there are no super admin users, promote the first user to super admin
  IF NOT EXISTS (
    SELECT 1 FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE r.name = 'super_admin' AND ucr.is_active = true
  ) THEN
    -- Get the first user
    SELECT id INTO admin_user_id FROM users ORDER BY created_at LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
      INSERT INTO user_church_roles (user_id, church_id, role_id, is_active, granted_at)
      VALUES (admin_user_id, NULL, super_admin_role_id, true, NOW())
      ON CONFLICT (user_id, church_id, role_id) DO UPDATE SET is_active = true;

      RAISE NOTICE 'Promoted first user % to super_admin role', admin_user_id;
    END IF;
  END IF;
END $$;

-- Create a function to easily grant admin access to users
CREATE OR REPLACE FUNCTION grant_super_admin_role(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id FROM users WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', user_email;
    RETURN FALSE;
  END IF;

  -- Get super admin role ID
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';

  -- Grant super admin role (NULL church_id means global access)
  INSERT INTO user_church_roles (user_id, church_id, role_id, is_active, granted_at)
  VALUES (target_user_id, NULL, super_admin_role_id, true, NOW())
  ON CONFLICT (user_id, church_id, role_id) DO UPDATE SET
    is_active = true,
    granted_at = NOW();

  RAISE NOTICE 'Granted super_admin role to user %', user_email;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION grant_super_admin_role(TEXT) TO authenticated;

-- Create a function to check if a user has admin permissions
CREATE OR REPLACE FUNCTION user_has_admin_permission(
  user_id UUID,
  permission_path TEXT,
  target_church_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Check if user has the required permission
  SELECT EXISTS (
    SELECT 1
    FROM user_church_roles ucr
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = user_has_admin_permission.user_id
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    AND r.is_active = true
    AND (
      -- Super admin has all permissions
      r.name = 'super_admin'
      OR
      -- Check specific permission in JSON
      (
        CASE
          WHEN permission_path = 'admin.churches.read' THEN
            (r.permissions->'admin'->'churches'->>'read')::boolean = true
          WHEN permission_path = 'admin.global' THEN
            (r.permissions->'admin'->>'global')::boolean = true
          ELSE
            -- Add more specific permission checks as needed
            FALSE
        END
      )
    )
    AND (
      -- Global access (church_id is NULL) OR specific church access
      ucr.church_id IS NULL
      OR target_church_id IS NULL
      OR ucr.church_id = target_church_id
    )
  ) INTO has_permission;

  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION user_has_admin_permission(UUID, TEXT, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION grant_super_admin_role(TEXT) IS 'Grants super admin role to a user by email address';
COMMENT ON FUNCTION user_has_admin_permission(UUID, TEXT, UUID) IS 'Checks if a user has a specific admin permission, optionally for a specific church';

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Admin permissions setup completed successfully!';
  RAISE NOTICE 'Use SELECT grant_super_admin_role(''user@example.com'') to grant admin access to users.';
END $$;