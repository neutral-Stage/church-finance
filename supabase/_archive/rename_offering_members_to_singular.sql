-- Rename offering_members table to offering_member (singular)
-- Since there should be only one member per offering

ALTER TABLE offering_members RENAME TO offering_member;

-- Update any indexes or constraints that reference the old table name
-- The foreign key constraints will be automatically updated

-- Grant permissions to the new table name
GRANT SELECT ON offering_member TO anon;
GRANT ALL PRIVILEGES ON offering_member TO authenticated;