-- Run this directly in Supabase SQL Editor
-- This will safely fix the role constraint issue

-- Step 1: Check what roles currently exist
SELECT 'Current roles in database:' as step, role, COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Step 2: Drop the existing constraint safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped existing users_role_check constraint';
    ELSE
        RAISE NOTICE 'No existing users_role_check constraint found';
    END IF;
END $$;

-- Step 3: Update any 'member' roles to 'viewer'
UPDATE users 
SET role = 'viewer', updated_at = NOW()
WHERE role = 'member';

-- Step 4: Fix any null or invalid roles
UPDATE users 
SET role = 'viewer', updated_at = NOW()
WHERE role IS NULL OR role = '' OR role NOT IN ('admin', 'treasurer', 'viewer');

-- Step 5: Show what we have now before adding constraint
SELECT 'Roles after cleanup:' as step, role, COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Step 6: Add the new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'treasurer', 'viewer'));

-- Step 7: Update the default value
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';

-- Step 8: Final verification
SELECT 'Final role distribution:' as step, role, COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Step 9: Show constraint was created
SELECT 
    'Constraint verification:' as step,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.constraint_name = 'users_role_check';