-- Debug query to check offering_members data
SELECT 
  o.id as offering_id,
  o.type,
  o.amount,
  o.service_date,
  om.id as offering_member_id,
  om.member_id,
  m.name as member_name,
  m.fellowship_name
FROM offerings o
LEFT JOIN offering_members om ON o.id = om.offering_id
LEFT JOIN members m ON om.member_id = m.id
ORDER BY o.service_date DESC
LIMIT 10;

-- Check if there are any offering_members records at all
SELECT COUNT(*) as total_offering_members FROM offering_members;

-- Check if there are any members
SELECT COUNT(*) as total_members FROM members;

-- Check recent offerings
SELECT COUNT(*) as total_offerings FROM offerings;