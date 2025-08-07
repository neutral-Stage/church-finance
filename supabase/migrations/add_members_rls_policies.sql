-- Add RLS policies for members table
-- This migration creates policies to allow authenticated users to perform CRUD operations

-- Policy for SELECT: Allow authenticated users to view all members
CREATE POLICY "authenticated_users_can_select_members" ON members
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for INSERT: Allow authenticated users to insert new members
CREATE POLICY "authenticated_users_can_insert_members" ON members
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for UPDATE: Allow authenticated users to update members
CREATE POLICY "authenticated_users_can_update_members" ON members
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for DELETE: Allow authenticated users to delete members
CREATE POLICY "authenticated_users_can_delete_members" ON members
    FOR DELETE
    TO authenticated
    USING (true);

-- Also allow anonymous users to view members (for public access if needed)
CREATE POLICY "anon_users_can_select_members" ON members
    FOR SELECT
    TO anon
    USING (true);