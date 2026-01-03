-- Fix offering types constraint to match frontend values
-- This migration updates existing data and the check constraint on the offerings table
-- to allow the offering types used in the frontend

-- First, update existing data to match new format
UPDATE offerings SET type = 'Tithe' WHERE type = 'tithe';
UPDATE offerings SET type = 'Lord''s Day' WHERE type = 'lords_day';
UPDATE offerings SET type = 'Special Offering' WHERE type = 'special';
UPDATE offerings SET type = 'Mission Fund Offering' WHERE type = 'mission';

-- Drop the existing constraint
ALTER TABLE offerings DROP CONSTRAINT offerings_type_check;

-- Add new constraint with the correct offering types
ALTER TABLE offerings ADD CONSTRAINT offerings_type_check 
  CHECK (type IN (
    'Tithe',
    'Lord''s Day', 
    'Other Offering',
    'Special Offering',
    'Mission Fund Offering',
    'Building Fund Offering'
  ));