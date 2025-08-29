-- Add document upload functionality to bills table
-- This migration adds document attachment support for bills

-- Add document_url column to bills table
ALTER TABLE bills ADD COLUMN document_url TEXT;
ALTER TABLE bills ADD COLUMN document_name TEXT;
ALTER TABLE bills ADD COLUMN document_size INTEGER;
ALTER TABLE bills ADD COLUMN document_type VARCHAR(100);
ALTER TABLE bills ADD COLUMN document_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create index for document queries
CREATE INDEX idx_bills_document_url ON bills(document_url);
CREATE INDEX idx_bills_document_uploaded_at ON bills(document_uploaded_at DESC);

-- Add constraint to ensure document metadata consistency
ALTER TABLE bills ADD CONSTRAINT check_document_metadata 
    CHECK (
        (document_url IS NULL AND document_name IS NULL AND document_size IS NULL AND document_type IS NULL AND document_uploaded_at IS NULL) OR
        (document_url IS NOT NULL AND document_name IS NOT NULL)
    );

-- Function to clean up orphaned document files (for future use)
CREATE OR REPLACE FUNCTION cleanup_orphaned_bill_documents()
RETURNS TABLE(
    document_url TEXT,
    bill_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.document_url,
        COUNT(*)::INTEGER as bill_count
    FROM bills b
    WHERE b.document_url IS NOT NULL
    GROUP BY b.document_url
    HAVING COUNT(*) = 0;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_orphaned_bill_documents() TO authenticated;

-- Update RLS policies to include document fields
DROP POLICY IF EXISTS "Users can view bills" ON bills;
CREATE POLICY "Users can view bills" ON bills
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert bills" ON bills;
CREATE POLICY "Users can insert bills" ON bills
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update bills" ON bills;
CREATE POLICY "Users can update bills" ON bills
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete bills" ON bills;
CREATE POLICY "Users can delete bills" ON bills
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Comment on new columns
COMMENT ON COLUMN bills.document_url IS 'URL/path to the uploaded bill document';
COMMENT ON COLUMN bills.document_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN bills.document_size IS 'Size of the document in bytes';
COMMENT ON COLUMN bills.document_type IS 'MIME type of the document';
COMMENT ON COLUMN bills.document_uploaded_at IS 'Timestamp when the document was uploaded';