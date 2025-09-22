-- Fix duplicate church records created by multiple migrations
-- This migration consolidates duplicate "Main Church" records and ensures data consistency

-- First, let's identify and fix duplicate churches
DO $$
DECLARE
    main_church_id UUID;
    duplicate_church_id UUID;
    church_rec RECORD;
BEGIN
    -- Find all churches with "Main Church" name
    FOR church_rec IN
        SELECT id, name, created_at
        FROM churches
        WHERE name ILIKE '%main church%'
        ORDER BY created_at ASC
    LOOP
        -- Keep the first (oldest) Main Church record
        IF main_church_id IS NULL THEN
            main_church_id := church_rec.id;
            RAISE NOTICE 'Keeping Main Church with ID: %', main_church_id;
        ELSE
            -- This is a duplicate
            duplicate_church_id := church_rec.id;
            RAISE NOTICE 'Found duplicate Main Church with ID: %', duplicate_church_id;

            -- Move all financial data from duplicate to main church
            -- Only update tables that actually have church_id columns

            -- Update funds (has church_id)
            UPDATE funds
            SET church_id = main_church_id
            WHERE church_id = duplicate_church_id;

            -- Update user church roles (has church_id)
            UPDATE user_church_roles
            SET church_id = main_church_id
            WHERE church_id = duplicate_church_id
            AND NOT EXISTS (
                SELECT 1 FROM user_church_roles
                WHERE church_id = main_church_id
                AND user_id = user_church_roles.user_id
                AND role_id = user_church_roles.role_id
            );

            -- Delete duplicate user church roles (if they would create conflicts)
            DELETE FROM user_church_roles
            WHERE church_id = duplicate_church_id;

            -- Update other tables through fund_id relationships (instead of direct church_id)
            -- Since these tables don't have church_id, we update through their fund relationships

            -- Update transactions (through fund_id if it has church_id column, otherwise skip)
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'transactions' AND column_name = 'church_id'
            ) THEN
                UPDATE transactions
                SET church_id = main_church_id
                WHERE church_id = duplicate_church_id;
            END IF;

            -- Update offerings (through fund_id if it has church_id column, otherwise skip)
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'offerings' AND column_name = 'church_id'
            ) THEN
                UPDATE offerings
                SET church_id = main_church_id
                WHERE church_id = duplicate_church_id;
            END IF;

            -- Update bills (through fund_id if it has church_id column, otherwise skip)
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'bills' AND column_name = 'church_id'
            ) THEN
                UPDATE bills
                SET church_id = main_church_id
                WHERE church_id = duplicate_church_id;
            END IF;

            -- Skip advances, petty_cash, ledger_entries as they don't have church_id columns
            -- They are related to churches through fund_id which we already updated

            -- Now delete the duplicate church
            DELETE FROM churches WHERE id = duplicate_church_id;

            RAISE NOTICE 'Merged and deleted duplicate church: %', duplicate_church_id;
        END IF;
    END LOOP;

    -- If no main church was found, this suggests the names might be different
    -- Let's check if there are any churches at all
    IF main_church_id IS NULL THEN
        SELECT id INTO main_church_id FROM churches LIMIT 1;
        IF main_church_id IS NOT NULL THEN
            RAISE NOTICE 'No "Main Church" found, but other churches exist with ID: %', main_church_id;
        ELSE
            RAISE NOTICE 'No churches found in database';
        END IF;
    END IF;
END $$;

-- Add unique constraint to prevent future duplicates (if it doesn't exist)
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_church_name_type'
    ) THEN
        ALTER TABLE churches
        ADD CONSTRAINT unique_church_name_type
        UNIQUE (name, type);
        RAISE NOTICE 'Added unique constraint: unique_church_name_type';
    ELSE
        RAISE NOTICE 'Unique constraint unique_church_name_type already exists';
    END IF;
END $$;

-- Update church names to be more descriptive if needed
UPDATE churches
SET description = COALESCE(description, 'Primary church for financial management')
WHERE name ILIKE '%main church%' AND description IS NULL;

-- Verify the fix by showing remaining churches
DO $$
DECLARE
    church_count INTEGER;
    church_rec RECORD;
BEGIN
    SELECT COUNT(*) INTO church_count FROM churches;
    RAISE NOTICE 'Total churches after cleanup: %', church_count;

    FOR church_rec IN SELECT id, name, type, created_at FROM churches ORDER BY created_at ASC LOOP
        RAISE NOTICE 'Church: % (%) - ID: % - Created: %',
            church_rec.name, church_rec.type, church_rec.id, church_rec.created_at;
    END LOOP;
END $$;