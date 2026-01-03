-- Force cleanup of all old constraints
-- First, check what constraints exist
SELECT 'Current constraints on offering_member:' as info;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'offering_member'::regclass;

-- Drop ALL constraints on the table and recreate them properly
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop all existing constraints on offering_member table
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'offering_member'::regclass
    LOOP
        EXECUTE 'ALTER TABLE offering_member DROP CONSTRAINT IF EXISTS ' || constraint_record.conname || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Recreate all necessary constraints with correct names
ALTER TABLE offering_member ADD CONSTRAINT offering_member_pkey PRIMARY KEY (id);
ALTER TABLE offering_member ADD CONSTRAINT offering_member_offering_id_member_id_key UNIQUE (offering_id, member_id);
ALTER TABLE offering_member ADD CONSTRAINT offering_member_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE;
ALTER TABLE offering_member ADD CONSTRAINT offering_member_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

-- Grant permissions
GRANT ALL PRIVILEGES ON offering_member TO authenticated;
GRANT SELECT ON offering_member TO anon;

-- Show final constraints
SELECT 'Final constraints on offering_member:' as info;
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'offering_member'::regclass;