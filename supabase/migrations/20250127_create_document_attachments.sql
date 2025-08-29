-- Create Document Attachments Table
-- This table stores file attachments for bills, ledger entries, and subgroups

CREATE TABLE document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the entity this document is attached to
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE CASCADE,
    ledger_subgroup_id UUID REFERENCES ledger_subgroups(id) ON DELETE CASCADE,
    
    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Storage information
    storage_path TEXT NOT NULL, -- Path in Supabase storage
    storage_bucket VARCHAR(100) DEFAULT 'documents' NOT NULL,
    
    -- Document metadata
    title VARCHAR(255), -- Optional custom title
    description TEXT,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN (
        'invoice', 'receipt', 'contract', 'quote', 'statement', 
        'correspondence', 'approval', 'general', 'other'
    )),
    
    -- Document properties
    is_primary BOOLEAN DEFAULT FALSE, -- Mark as primary document
    is_confidential BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Array of tags for categorization
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES document_attachments(id) ON DELETE SET NULL,
    
    -- Audit fields
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure document is attached to exactly one entity
ALTER TABLE document_attachments ADD CONSTRAINT check_single_attachment 
    CHECK (
        (bill_id IS NOT NULL AND ledger_entry_id IS NULL AND ledger_subgroup_id IS NULL) OR
        (bill_id IS NULL AND ledger_entry_id IS NOT NULL AND ledger_subgroup_id IS NULL) OR
        (bill_id IS NULL AND ledger_entry_id IS NULL AND ledger_subgroup_id IS NOT NULL)
    );

-- Create indexes for efficient querying
CREATE INDEX idx_document_attachments_bill_id ON document_attachments(bill_id);
CREATE INDEX idx_document_attachments_ledger_entry_id ON document_attachments(ledger_entry_id);
CREATE INDEX idx_document_attachments_ledger_subgroup_id ON document_attachments(ledger_subgroup_id);
CREATE INDEX idx_document_attachments_category ON document_attachments(category);
CREATE INDEX idx_document_attachments_is_primary ON document_attachments(is_primary);
CREATE INDEX idx_document_attachments_uploaded_by ON document_attachments(uploaded_by);
CREATE INDEX idx_document_attachments_created_at ON document_attachments(created_at DESC);
CREATE INDEX idx_document_attachments_tags ON document_attachments USING GIN(tags);
CREATE INDEX idx_document_attachments_storage_path ON document_attachments(storage_path);
CREATE INDEX idx_document_attachments_parent_document ON document_attachments(parent_document_id);

-- Trigger for updating updated_at timestamp
CREATE TRIGGER trigger_document_attachments_updated_at
    BEFORE UPDATE ON document_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get document attachment summary for an entity
CREATE OR REPLACE FUNCTION get_document_summary(
    entity_type VARCHAR(20),
    entity_id UUID
)
RETURNS TABLE(
    total_documents INTEGER,
    primary_document_id UUID,
    primary_document_name VARCHAR(255),
    categories TEXT[]
) AS $$
BEGIN
    IF entity_type = 'bill' THEN
        RETURN QUERY
        SELECT 
            COUNT(*)::INTEGER as total_documents,
            (SELECT id FROM document_attachments WHERE bill_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_id,
            (SELECT file_name FROM document_attachments WHERE bill_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_name,
            ARRAY_AGG(DISTINCT category) as categories
        FROM document_attachments
        WHERE bill_id = entity_id;
    ELSIF entity_type = 'ledger_entry' THEN
        RETURN QUERY
        SELECT 
            COUNT(*)::INTEGER as total_documents,
            (SELECT id FROM document_attachments WHERE ledger_entry_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_id,
            (SELECT file_name FROM document_attachments WHERE ledger_entry_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_name,
            ARRAY_AGG(DISTINCT category) as categories
        FROM document_attachments
        WHERE ledger_entry_id = entity_id;
    ELSIF entity_type = 'ledger_subgroup' THEN
        RETURN QUERY
        SELECT 
            COUNT(*)::INTEGER as total_documents,
            (SELECT id FROM document_attachments WHERE ledger_subgroup_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_id,
            (SELECT file_name FROM document_attachments WHERE ledger_subgroup_id = entity_id AND is_primary = TRUE LIMIT 1) as primary_document_name,
            ARRAY_AGG(DISTINCT category) as categories
        FROM document_attachments
        WHERE ledger_subgroup_id = entity_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one primary document per entity
CREATE OR REPLACE FUNCTION ensure_single_primary_document()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a document as primary, unset others for the same entity
    IF NEW.is_primary = TRUE THEN
        IF NEW.bill_id IS NOT NULL THEN
            UPDATE document_attachments 
            SET is_primary = FALSE 
            WHERE bill_id = NEW.bill_id AND id != NEW.id;
        ELSIF NEW.ledger_entry_id IS NOT NULL THEN
            UPDATE document_attachments 
            SET is_primary = FALSE 
            WHERE ledger_entry_id = NEW.ledger_entry_id AND id != NEW.id;
        ELSIF NEW.ledger_subgroup_id IS NOT NULL THEN
            UPDATE document_attachments 
            SET is_primary = FALSE 
            WHERE ledger_subgroup_id = NEW.ledger_subgroup_id AND id != NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary document
CREATE TRIGGER trigger_ensure_single_primary_document
    BEFORE INSERT OR UPDATE ON document_attachments
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_document();

-- Enable Row Level Security
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view document attachments" ON document_attachments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert document attachments" ON document_attachments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update document attachments" ON document_attachments
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete document attachments" ON document_attachments
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL PRIVILEGES ON document_attachments TO anon;
GRANT ALL PRIVILEGES ON document_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_summary(VARCHAR(20), UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_document_summary(VARCHAR(20), UUID) TO authenticated;

-- Create storage bucket policy (this would typically be done through Supabase dashboard)
-- But we'll include it here for reference
/*
Storage bucket policies for 'documents' bucket:
1. Allow authenticated users to upload files
2. Allow public read access for non-confidential documents
3. Restrict confidential documents to authenticated users only
*/

-- Sample data for testing
INSERT INTO document_attachments (
    bill_id, file_name, file_size, file_type, mime_type, storage_path, 
    title, description, category, uploaded_by
) VALUES 
(
    (SELECT id FROM bills LIMIT 1), 
    'invoice_001.pdf', 1024000, 'pdf', 'application/pdf', 
    'bills/invoice_001.pdf', 'Monthly Service Invoice', 
    'Invoice for monthly maintenance services', 'invoice', 'admin'
),
(
    (SELECT id FROM bills LIMIT 1), 
    'receipt_001.jpg', 512000, 'jpg', 'image/jpeg', 
    'bills/receipt_001.jpg', 'Payment Receipt', 
    'Receipt showing payment confirmation', 'receipt', 'admin'
);

COMMIT;