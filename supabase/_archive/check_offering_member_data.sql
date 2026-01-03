-- Check actual data in offering_member table
SELECT 
  om.id,
  om.offering_id,
  om.member_id,
  o.service_date,
  o.type,
  o.amount,
  m.name as member_name,
  m.fellowship_name
FROM offering_member om
JOIN offerings o ON om.offering_id = o.id
JOIN members m ON om.member_id = m.id
ORDER BY o.service_date DESC;

-- Count total records in offering_member
SELECT COUNT(*) as total_offering_member_records FROM offering_member;

-- Count total offerings
SELECT COUNT(*) as total_offerings FROM offerings;

-- Find offerings without member relationships
SELECT 
  o.id,
  o.service_date,
  o.type,
  o.amount
FROM offerings o
LEFT JOIN offering_member om ON o.id = om.offering_id
WHERE om.offering_id IS NULL
ORDER BY o.service_date DESC;