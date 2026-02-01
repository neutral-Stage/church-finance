-- Update offerings_type_check constraint to accept new type values from UI
-- Old values: 'tithe', 'lords_day', 'special', 'mission', 'thanksgiving', 'building', 'welfare', 'other'
-- New values: 'Tithe', "Lord's Day", 'Other Offering', 'Special Offering', 'Mission Fund Offering', 'Building Fund Offering'

ALTER TABLE public.offerings DROP CONSTRAINT IF EXISTS offerings_type_check;

ALTER TABLE public.offerings ADD CONSTRAINT offerings_type_check 
  CHECK (type IN (
    'tithe', 'lords_day', 'special', 'mission', 'thanksgiving', 'building', 'welfare', 'other',
    'Tithe', 'Lord''s Day', 'Other Offering', 'Special Offering', 'Mission Fund Offering', 'Building Fund Offering'
  ));
