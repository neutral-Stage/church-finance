-- Create storage policies for the documents bucket
-- This allows authenticated users to upload, view, and manage documents

-- Enable RLS on the storage.objects table (should already be enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to the documents bucket
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy to allow authenticated users to view/download files from the documents bucket
CREATE POLICY "Allow authenticated users to view documents" ON storage.objects
FOR SELECT 
TO authenticated
USING (bucket_id = 'documents');

-- Policy to allow authenticated users to update their uploaded files
CREATE POLICY "Allow authenticated users to update documents" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy to allow authenticated users to delete their uploaded files
CREATE POLICY "Allow authenticated users to delete documents" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'documents');

-- Ensure the documents bucket exists (create if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;