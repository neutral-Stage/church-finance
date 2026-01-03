-- Test query to check offering_member data and relationships
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
LEFT JOIN offering_member om ON o.id = om.offering_id
LEFT JOIN members m ON om.member_id = m.id
ORDER BY o.service_date DESC
LIMIT 10;

-- Check if there are any records in offering_member table
SELECT COUNT(*) as offering_member_count FROM offering_member;

-- Check if there are any records in members table
SELECT COUNT(*) as members_count FROM members;

-- Check if there are any records in offerings table
SELECT COUNT(*) as offerings_count FROM offerings;