-- Fix RLS policies for offering_member table
-- The table was renamed from offering_members but RLS policies weren't transferred

-- Ensure RLS is enabled
ALTER TABLE offering_member ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for authenticated users
CREATE POLICY "authenticated_users_can_select_offering_member" ON offering_member
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_offering_member" ON offering_member
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_offering_member" ON offering_member
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_offering_member" ON offering_member
    FOR DELETE
    TO authenticated
    USING (true);

-- Add policies for anon users to read data
CREATE POLICY "anon_users_can_select_offering_member" ON offering_member
    FOR SELECT
    TO anon
    USING (true);

-- Ensure grants are in place
GRANT SELECT ON offering_member TO anon;
GRANT ALL PRIVILEGES ON offering_member TO authenticated;