-- Check for duplicate records in offering_member table
SELECT 'Checking for duplicate records:' as info;
SELECT offering_id, member_id, COUNT(*) as count
FROM offering_member 
GROUP BY offering_id, member_id 
HAVING COUNT(*) > 1;

-- Remove duplicate records, keeping only the first one
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    FOR duplicate_record IN 
        SELECT offering_id, member_id, COUNT(*) as count
        FROM offering_member 
        GROUP BY offering_id, member_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Delete all but the first record for each duplicate pair
        DELETE FROM offering_member 
        WHERE (offering_id, member_id) = (duplicate_record.offering_id, duplicate_record.member_id)
        AND id NOT IN (
            SELECT id FROM offering_member 
            WHERE offering_id = duplicate_record.offering_id 
            AND member_id = duplicate_record.member_id 
            ORDER BY created_at ASC 
            LIMIT 1
        );
        
        RAISE NOTICE 'Cleaned up duplicates for offering_id: %, member_id: %', 
                     duplicate_record.offering_id, duplicate_record.member_id;
    END LOOP;
END $$;

-- Show final count
SELECT 'Final record count:' as info;
SELECT COUNT(*) as total_records FROM offering_member;

-- Show any remaining duplicates (should be none)
SELECT 'Remaining duplicates (should be empty):' as info;
SELECT offering_id, member_id, COUNT(*) as count
FROM offering_member 
GROUP BY offering_id, member_id 
HAVING COUNT(*) > 1;