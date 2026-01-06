-- Fix Profile Update RLS and Ensure Storage Buckets

-- 1. Fix Users Table RLS
-- The frontend uses .upsert() which requires both SELECT, UPDATE and INSERT permissions.
-- We already have SELECT and UPDATE, adding INSERT.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (id = auth.uid());

-- 2. Ensure Storage Buckets and Policies

-- Helper function to setup bucket and policies
CREATE OR REPLACE FUNCTION setup_bucket_with_policies(bucket_name TEXT, is_public BOOLEAN DEFAULT false)
RETURNS VOID AS $$
BEGIN
    -- Create bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, is_public)
    ON CONFLICT (id) DO NOTHING;

    -- Drop existing policies for this bucket to avoid conflicts
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to upload files for %I" ON storage.objects', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to view files for %I" ON storage.objects', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to update files for %I" ON storage.objects', bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to delete files for %I" ON storage.objects', bucket_name);

    -- Policy: Allow authenticated users to upload files
    EXECUTE format('CREATE POLICY "Allow authenticated users to upload files for %I" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = %L AND auth.role() = %L)', bucket_name, bucket_name, 'authenticated');

    -- Policy: Allow authenticated users to view files
    EXECUTE format('CREATE POLICY "Allow authenticated users to view files for %I" ON storage.objects
        FOR SELECT USING (bucket_id = %L AND auth.role() = %L)', bucket_name, bucket_name, 'authenticated');

    -- Policy: Allow authenticated users to update files
    EXECUTE format('CREATE POLICY "Allow authenticated users to update files for %I" ON storage.objects
        FOR UPDATE WITH CHECK (bucket_id = %L AND auth.role() = %L)', bucket_name, bucket_name, 'authenticated');

    -- Policy: Allow authenticated users to delete files
    EXECUTE format('CREATE POLICY "Allow authenticated users to delete files for %I" ON storage.objects
        FOR DELETE USING (bucket_id = %L AND auth.role() = %L)', bucket_name, bucket_name, 'authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup 'documents' bucket
SELECT setup_bucket_with_policies('documents', false);

-- Setup 'avatars' bucket
SELECT setup_bucket_with_policies('avatars', true);

-- Cleanup
DROP FUNCTION setup_bucket_with_policies(TEXT, BOOLEAN);
