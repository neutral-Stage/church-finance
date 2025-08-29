-- Create Ledger Entries System
-- This migration creates the ledger entries table to serve as bill group containers

-- Create ledger_entries table (main bill group containers)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    total_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (total_amount >= 0),
    default_due_date DATE,
    default_fund_id UUID REFERENCES funds(id),
    responsible_parties TEXT[], -- Array of responsible party names
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}', -- For flexible additional data
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ledger_entries
CREATE INDEX idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX idx_ledger_entries_default_due_date ON ledger_entries(default_due_date);
CREATE INDEX idx_ledger_entries_priority ON ledger_entries(priority);
CREATE INDEX idx_ledger_entries_approval_status ON ledger_entries(approval_status);
CREATE INDEX idx_ledger_entries_created_by ON ledger_entries(created_by);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_entries_responsible_parties ON ledger_entries USING GIN(responsible_parties);
CREATE INDEX idx_ledger_entries_metadata ON ledger_entries USING GIN(metadata);

-- Function to update ledger entry total amount
CREATE OR REPLACE FUNCTION update_ledger_entry_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_amount based on associated bills
    IF TG_TABLE_NAME = 'bills' THEN
        IF NEW.ledger_entry_id IS NOT NULL THEN
            UPDATE ledger_entries 
            SET total_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM bills 
                WHERE ledger_entry_id = NEW.ledger_entry_id
            ),
            updated_at = NOW()
            WHERE id = NEW.ledger_entry_id;
        END IF;
        
        -- Handle old ledger entry if bill was moved
        IF TG_OP = 'UPDATE' AND OLD.ledger_entry_id IS NOT NULL AND OLD.ledger_entry_id != NEW.ledger_entry_id THEN
            UPDATE ledger_entries 
            SET total_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM bills 
                WHERE ledger_entry_id = OLD.ledger_entry_id
            ),
            updated_at = NOW()
            WHERE id = OLD.ledger_entry_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at timestamp
CREATE TRIGGER trigger_ledger_entries_updated_at
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON ledger_entries TO anon;
GRANT ALL PRIVILEGES ON ledger_entries TO authenticated;

-- Create RLS policies
CREATE POLICY "Users can view all ledger entries" ON ledger_entries
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ledger entries" ON ledger_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ledger entries" ON ledger_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ledger entries" ON ledger_entries
    FOR DELETE USING (auth.role() = 'authenticated');