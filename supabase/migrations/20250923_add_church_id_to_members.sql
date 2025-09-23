-- Add church_id column to members table for multi-church support
-- This migration adds the missing church_id column to the members table

-- Add church_id column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Create index for members church relationship
CREATE INDEX IF NOT EXISTS idx_members_church ON members(church_id);

-- Update existing members to belong to the default church
DO $$
DECLARE
    default_church_id UUID;
BEGIN
    SELECT id INTO default_church_id FROM churches WHERE name = 'Main Church' LIMIT 1;

    -- If default church doesn't exist, create it
    IF default_church_id IS NULL THEN
        INSERT INTO churches (name, type, description, is_active)
        VALUES ('Main Church', 'church', 'Default church for existing data', true)
        RETURNING id INTO default_church_id;
    END IF;

    -- Update existing members to belong to the default church
    UPDATE members SET church_id = default_church_id WHERE church_id IS NULL;
END $$;

-- Make church_id NOT NULL after updating existing records
ALTER TABLE members ALTER COLUMN church_id SET NOT NULL;

-- Update RLS policies for members to include church access
DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON members;
DROP POLICY IF EXISTS "Users can view members from their churches" ON members;
DROP POLICY IF EXISTS "Users with permissions can manage members" ON members;

-- Create RLS policy for viewing members from user's churches
CREATE POLICY "Users can view members from their churches" ON members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            WHERE ucr.church_id = members.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

-- Create RLS policy for managing members (INSERT, UPDATE, DELETE)
CREATE POLICY "Users with permissions can manage members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = members.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (
                r.permissions->'members'->>'create' = 'true'
                OR r.permissions->'members'->>'update' = 'true'
                OR r.permissions->'members'->>'delete' = 'true'
            )
        )
    );