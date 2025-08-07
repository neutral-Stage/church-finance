-- Add description field to funds table
ALTER TABLE funds ADD COLUMN description TEXT;

-- Update existing funds with default descriptions
UPDATE funds SET description = 
  CASE 
    WHEN name = 'Management' THEN 'General church operations and administrative expenses'
    WHEN name = 'Mission' THEN 'Missionary support and outreach programs'
    WHEN name = 'Building' THEN 'Building maintenance, improvements, and construction projects'
    ELSE 'General fund for church activities'
  END;

-- Make description field not null after setting defaults
ALTER TABLE funds ALTER COLUMN description SET NOT NULL;