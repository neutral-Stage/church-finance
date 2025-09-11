-- Create a metadata table for extended fund information
-- This allows us to store custom fund names, types, and targets while working with the existing funds table

CREATE TABLE fund_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    custom_name VARCHAR(255) NOT NULL,
    fund_type VARCHAR(100),
    target_amount DECIMAL(12,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fund_id)
);

-- Create indexes
CREATE INDEX idx_fund_metadata_fund_id ON fund_metadata(fund_id);
CREATE INDEX idx_fund_metadata_type ON fund_metadata(fund_type);

-- Grant permissions
GRANT SELECT ON fund_metadata TO anon;
GRANT ALL PRIVILEGES ON fund_metadata TO authenticated;

-- Create RLS policies
ALTER TABLE fund_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fund_metadata" ON fund_metadata
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage fund_metadata" ON fund_metadata
    FOR ALL USING (auth.role() = 'authenticated');