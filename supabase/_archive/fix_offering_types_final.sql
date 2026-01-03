-- Fix offering types constraint to match frontend types
-- Step 1: Drop the existing constraint completely
ALTER TABLE offerings DROP CONSTRAINT IF EXISTS offerings_type_check;

-- Step 2: Increase the varchar length to accommodate longer type names
ALTER TABLE offerings ALTER COLUMN type TYPE varchar(50);

-- Step 3: Update existing data to match new format
UPDATE offerings SET type = 'Tithe' WHERE type = 'tithe';
UPDATE offerings SET type = 'Lord''s Day' WHERE type = 'lords_day';
UPDATE offerings SET type = 'Special Offering' WHERE type = 'special';
UPDATE offerings SET type = 'Mission Fund Offering' WHERE type = 'mission';

-- Step 4: Add new constraint that allows frontend types
ALTER TABLE offerings ADD CONSTRAINT offerings_type_check 
  CHECK (type IN ('Tithe', 'Lord''s Day', 'Other Offering', 'Special Offering', 'Mission Fund Offering', 'Building Fund Offering'));