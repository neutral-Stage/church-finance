-- Debug query to check offering_member table data and relationships

-- 1. Check all records in offering_member table
SELECT 
    om.id,
    om.offering_id,
    om.member_id,
    om.created_at,
    o.type as offering_type,
    o.service_date,
    o.amount,
    m.name as member_name
FROM offering_member om
LEFT JOIN offerings o ON om.offering_id = o.id
LEFT JOIN members m ON om.member_id = m.id
ORDER BY o.service_date DESC;

-- 2. Count total records in offering_member
SELECT COUNT(*) as total_offering_member_records FROM offering_member;

-- 3. Check for offerings without member relationships
SELECT 
    o.id,
    o.type,
    o.service_date,
    o.amount,
    CASE WHEN om.id IS NULL THEN 'NO MEMBER' ELSE 'HAS MEMBER' END as member_status
FROM offerings o
LEFT JOIN offering_member om ON o.id = om.offering_id
ORDER BY o.service_date DESC;

-- 4. Check for duplicate offering_member relationships
SELECT 
    offering_id,
    COUNT(*) as relationship_count
FROM offering_member
GROUP BY offering_id
HAVING COUNT(*) > 1;

-- 5. Verify member data exists
SELECT COUNT(*) as total_members FROM members;
SELECT id, name FROM members LIMIT 5;