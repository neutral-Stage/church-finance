-- Drop any remaining old constraints with plural names
DO $$ 
BEGIN
    -- Drop old unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_offering_id_member_id_key') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_offering_id_member_id_key;
        RAISE NOTICE 'Dropped old unique constraint: offering_members_offering_id_member_id_key';
    END IF;
    
    -- Drop old primary key if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_members_pkey') THEN
        ALTER TABLE offering_member DROP CONSTRAINT offering_members_pkey;
        RAISE NOTICE 'Dropped old primary key: offering_members_pkey';
    END IF;
END $$;

-- Ensure proper primary key exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'offering_member'::regclass AND contype = 'p') THEN
        ALTER TABLE offering_member ADD CONSTRAINT offering_member_pkey PRIMARY KEY (id);
        RAISE NOTICE 'Added primary key: offering_member_pkey';
    END IF;
END $$;

-- Ensure proper unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offering_member_offering_id_member_id_key') THEN
        ALTER TABLE offering_member ADD CONSTRAINT offering_member_offering_id_member_id_key UNIQUE (offering_id, member_id);
        RAISE NOTICE 'Added unique constraint: offering_member_offering_id_member_id_key';
    END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON offering_member TO authenticated;
GRANT SELECT ON offering_member TO anon;