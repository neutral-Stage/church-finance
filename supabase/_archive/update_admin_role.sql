-- Update admin@church.com role from member to admin
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'admin@church.com';

-- Verify the update
SELECT email, role, updated_at 
FROM users 
WHERE email = 'admin@church.com';