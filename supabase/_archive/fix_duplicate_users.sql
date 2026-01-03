-- Fix duplicate user records
-- Keep the most recent record for each user ID and remove duplicates

-- First, check for duplicates
WITH duplicates AS (
  SELECT 
    id,
    COUNT(*) as count,
    array_agg(ctid ORDER BY updated_at DESC, created_at DESC) as rows
  FROM users 
  GROUP BY id
  HAVING COUNT(*) > 1
)
SELECT 
  d.id,
  d.count,
  u.email,
  u.role,
  u.created_at,
  u.updated_at
FROM duplicates d
JOIN users u ON u.id = d.id
ORDER BY d.id, u.updated_at DESC;

-- Remove duplicates, keeping the most recent record for each user ID
WITH duplicates_to_delete AS (
  SELECT 
    ctid,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM users
)
DELETE FROM users 
WHERE ctid IN (
  SELECT ctid 
  FROM duplicates_to_delete 
  WHERE rn > 1
);

-- Verify no duplicates remain
SELECT 
  id,
  COUNT(*) as count
FROM users 
GROUP BY id
HAVING COUNT(*) > 1;

-- Show final user count and roles
SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;