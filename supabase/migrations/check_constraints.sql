-- Check all constraints on offering_member table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'offering_member'::regclass;

-- Also check if there are any constraints with the old name pattern
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%offering_members%';