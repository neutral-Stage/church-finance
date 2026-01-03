-- Check if there are any records in each table
SELECT 'offering_member' as table_name, COUNT(*) as record_count FROM offering_member
UNION ALL
SELECT 'members' as table_name, COUNT(*) as record_count FROM members
UNION ALL
SELECT 'offerings' as table_name, COUNT(*) as record_count FROM offerings;

-- Show sample data from each table
SELECT 'Sample offering_member records:' as info;
SELECT * FROM offering_member LIMIT 5;

SELECT 'Sample members records:' as info;
SELECT id, name, fellowship_name FROM members LIMIT 5;

SELECT 'Sample offerings records:' as info;
SELECT id, type, amount, service_date FROM offerings LIMIT 5;