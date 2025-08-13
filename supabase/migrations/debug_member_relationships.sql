-- Debug query to check offering_member relationships
SELECT 
  om.id as relationship_id,
  om.offering_id,
  om.member_id,
  o.type as offering_type,
  o.amount,
  o.service_date,
  m.name as member_name,
  m.fellowship_name
FROM offering_member om
JOIN offerings o ON om.offering_id = o.id
JOIN members m ON om.member_id = m.id
ORDER BY o.service_date DESC;

-- Also check all offerings to see which ones don't have member relationships
SELECT 
  o.id,
  o.type,
  o.amount,
  o.service_date,
  CASE 
    WHEN om.id IS NOT NULL THEN 'HAS MEMBER'
    ELSE 'NO MEMBER'
  END as member_status
FROM offerings o
LEFT JOIN offering_member om ON o.id = om.offering_id
ORDER BY o.service_date DESC;

-- Count relationships
SELECT 
  COUNT(*) as total_offerings,
  COUNT(om.id) as offerings_with_members,
  COUNT(*) - COUNT(om.id) as offerings_without_members
FROM offerings o
LEFT JOIN offering_member om ON o.id = om.offering_id;