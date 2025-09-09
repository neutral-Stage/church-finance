-- Fix user role constraint safely
-- This migration handles existing constraints and data properly

-- First, check current constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped existing users_role_check constraint';
    END IF;
END $$;

-- Update any existing 'member' roles to 'viewer'
UPDATE users 
SET role = 'viewer', updated_at = NOW()
WHERE role = 'member';

-- Check for any invalid role values before adding constraint
DO $$
DECLARE
    invalid_roles TEXT;
BEGIN
    SELECT string_agg(DISTINCT role, ', ')
    INTO invalid_roles
    FROM users 
    WHERE role NOT IN ('admin', 'treasurer', 'viewer');
    
    IF invalid_roles IS NOT NULL THEN
        RAISE EXCEPTION 'Found invalid roles that need to be fixed first: %', invalid_roles;
    END IF;
END $$;

-- Add the new constraint with correct role types
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'treasurer', 'viewer'));

-- Update the default value to 'viewer'
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';

-- Verify the changes
SELECT 
    'Role distribution after migration:' as info,
    role, 
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Show any users that might have null or empty roles
SELECT 
    'Users with null/empty roles:' as info,
    id,
    email,
    full_name,
    role
FROM users 
WHERE role IS NULL OR role = '';