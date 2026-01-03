-- Check for duplicate user records that could cause the 'single()' error
SELECT 
  id,
  email,
  role,
  COUNT(*) as count
FROM users 
GROUP BY id, email, role
HAVING COUNT(*) > 1;

-- Check all users and their roles
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM users 
ORDER BY created_at;

-- Check for users with admin role
SELECT 
  id,
  email,
  role,
  full_name
FROM users 
WHERE role = 'admin';

-- Check for any users that might have multiple entries with same ID
SELECT 
  id,
  COUNT(*) as count
FROM users 
GROUP BY id
HAVING COUNT(*) > 1;