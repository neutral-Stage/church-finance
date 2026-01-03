-- Fix constraint names to match the singular table name
-- Drop old constraints and recreate with correct names

-- Drop the old foreign key constraints
ALTER TABLE offering_member DROP CONSTRAINT IF EXISTS offering_members_offering_id_fkey;
ALTER TABLE offering_member DROP CONSTRAINT IF EXISTS offering_members_member_id_fkey;

-- Drop the old unique constraint that's causing the duplicate key error
ALTER TABLE offering_member DROP CONSTRAINT IF EXISTS offering_members_offering_id_member_id_key;

-- Recreate foreign key constraints with correct names
ALTER TABLE offering_member 
  ADD CONSTRAINT offering_member_offering_id_fkey 
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE;

ALTER TABLE offering_member 
  ADD CONSTRAINT offering_member_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

-- Add unique constraint with correct name to ensure one member per offering
ALTER TABLE offering_member 
  ADD CONSTRAINT offering_member_offering_id_member_id_key 
  UNIQUE (offering_id, member_id);