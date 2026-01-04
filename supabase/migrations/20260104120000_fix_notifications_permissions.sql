-- Grant permissions to roles
GRANT ALL ON TABLE notifications TO service_role;
GRANT ALL ON TABLE notifications TO postgres;
GRANT ALL ON TABLE notifications TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure correctness

-- Policy for users to view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy for users to update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy for users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow service_role full access (explicit policy not needed usually, but good for clarity if bypass disabled)
-- Note: Service role bypasses RLS by default, so we just rely on GRANT ALL.
