-- Fix user role constraint to match TypeScript definitions
-- Change 'member' role to 'viewer' and update constraint

-- First, update any existing 'member' roles to 'viewer'
UPDATE users 
SET role = 'viewer', updated_at = NOW()
WHERE role = 'member';

-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with correct role types
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'treasurer', 'viewer'));

-- Update the default value to 'viewer'
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';

-- Verify the changes
SELECT 
  role, 
  COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;