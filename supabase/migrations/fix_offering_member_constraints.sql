-- Fix any remaining old constraint names that might be causing duplicate key errors
-- Only drop old constraints if they exist, don't create new ones since they already exist correctly

-- Drop old constraint with plural name if it still exists
DO $$ 
BEGIN
    -- Drop old unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_offering_id_member_id_key') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_offering_id_member_id_key;
    END IF;
    
    -- Drop old primary key constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_pkey') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_pkey;
    END IF;
    
    -- Drop old foreign key constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_offering_id_fkey') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_offering_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_member_id_fkey') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_member_id_fkey;
    END IF;
END $$;

-- Ensure the unique constraint exists with the correct name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_member_offering_id_member_id_key') THEN
        ALTER TABLE offering_member ADD CONSTRAINT offering_member_offering_id_member_id_key UNIQUE (offering_id, member_id);
    END IF;
END $$;