-- Update Bills Table Schema for Ledger Entries System
-- This migration adds hierarchical references to the bills table

-- Add new columns to bills table for hierarchical structure
ALTER TABLE bills ADD COLUMN ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE bills ADD COLUMN ledger_subgroup_id UUID REFERENCES ledger_subgroups(id) ON DELETE SET NULL;
ALTER TABLE bills ADD COLUMN responsible_parties TEXT[]; -- Individual responsible parties for this bill
ALTER TABLE bills ADD COLUMN allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);
ALTER TABLE bills ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE bills ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE bills ADD COLUMN approved_by VARCHAR(255);
ALTER TABLE bills ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bills ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE bills ADD COLUMN notes TEXT;
ALTER TABLE bills ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE bills ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for new columns
CREATE INDEX idx_bills_ledger_entry_id ON bills(ledger_entry_id);
CREATE INDEX idx_bills_ledger_subgroup_id ON bills(ledger_subgroup_id);
CREATE INDEX idx_bills_priority ON bills(priority);
CREATE INDEX idx_bills_approval_status ON bills(approval_status);
CREATE INDEX idx_bills_sort_order ON bills(sort_order);
CREATE INDEX idx_bills_responsible_parties ON bills USING GIN(responsible_parties);
CREATE INDEX idx_bills_metadata ON bills USING GIN(metadata);
CREATE INDEX idx_bills_updated_at ON bills(updated_at DESC);

-- Add constraint to ensure bill belongs to either ledger entry directly or through subgroup
ALTER TABLE bills ADD CONSTRAINT check_bill_hierarchy 
    CHECK (
        (ledger_entry_id IS NOT NULL AND ledger_subgroup_id IS NULL) OR
        (ledger_entry_id IS NULL AND ledger_subgroup_id IS NOT NULL) OR
        (ledger_entry_id IS NULL AND ledger_subgroup_id IS NULL)
    );

-- Update existing bills to have updated_at timestamp
UPDATE bills SET updated_at = created_at WHERE updated_at IS NULL;

-- Trigger for updating updated_at timestamp on bills
CREATE TRIGGER trigger_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the existing trigger function to handle new hierarchical structure
CREATE OR REPLACE FUNCTION update_ledger_totals_from_bills()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle ledger entry totals
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update ledger subgroup total if bill belongs to subgroup
        IF NEW.ledger_subgroup_id IS NOT NULL THEN
            UPDATE ledger_subgroups 
            SET total_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM bills 
                WHERE ledger_subgroup_id = NEW.ledger_subgroup_id
            ),
            updated_at = NOW()
            WHERE id = NEW.ledger_subgroup_id;
        END IF;
        
        -- Update ledger entry total if bill belongs directly to entry
        IF NEW.ledger_entry_id IS NOT NULL THEN
            UPDATE ledger_entries 
            SET total_amount = (
                SELECT COALESCE(SUM(ls.total_amount), 0) + COALESCE(SUM(b.amount), 0)
                FROM ledger_subgroups ls
                FULL OUTER JOIN bills b ON b.ledger_entry_id = NEW.ledger_entry_id AND b.ledger_subgroup_id IS NULL
                WHERE ls.ledger_entry_id = NEW.ledger_entry_id
            ),
            updated_at = NOW()
            WHERE id = NEW.ledger_entry_id;
        END IF;
        
        -- Handle old associations if bill was moved
        IF TG_OP = 'UPDATE' THEN
            -- Update old ledger subgroup
            IF OLD.ledger_subgroup_id IS NOT NULL AND OLD.ledger_subgroup_id != NEW.ledger_subgroup_id THEN
                UPDATE ledger_subgroups 
                SET total_amount = (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM bills 
                    WHERE ledger_subgroup_id = OLD.ledger_subgroup_id
                ),
                updated_at = NOW()
                WHERE id = OLD.ledger_subgroup_id;
            END IF;
            
            -- Update old ledger entry
            IF OLD.ledger_entry_id IS NOT NULL AND OLD.ledger_entry_id != NEW.ledger_entry_id THEN
                UPDATE ledger_entries 
                SET total_amount = (
                    SELECT COALESCE(SUM(ls.total_amount), 0) + COALESCE(SUM(b.amount), 0)
                    FROM ledger_subgroups ls
                    FULL OUTER JOIN bills b ON b.ledger_entry_id = OLD.ledger_entry_id AND b.ledger_subgroup_id IS NULL
                    WHERE ls.ledger_entry_id = OLD.ledger_entry_id
                ),
                updated_at = NOW()
                WHERE id = OLD.ledger_entry_id;
            END IF;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update ledger subgroup total
        IF OLD.ledger_subgroup_id IS NOT NULL THEN
            UPDATE ledger_subgroups 
            SET total_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM bills 
                WHERE ledger_subgroup_id = OLD.ledger_subgroup_id
            ),
            updated_at = NOW()
            WHERE id = OLD.ledger_subgroup_id;
        END IF;
        
        -- Update ledger entry total
        IF OLD.ledger_entry_id IS NOT NULL THEN
            UPDATE ledger_entries 
            SET total_amount = (
                SELECT COALESCE(SUM(ls.total_amount), 0) + COALESCE(SUM(b.amount), 0)
                FROM ledger_subgroups ls
                FULL OUTER JOIN bills b ON b.ledger_entry_id = OLD.ledger_entry_id AND b.ledger_subgroup_id IS NULL
                WHERE ls.ledger_entry_id = OLD.ledger_entry_id
            ),
            updated_at = NOW()
            WHERE id = OLD.ledger_entry_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating ledger totals from bills
CREATE TRIGGER trigger_update_ledger_totals_from_bills
    AFTER INSERT OR UPDATE OR DELETE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_ledger_totals_from_bills();

-- Function to get bill hierarchy path
CREATE OR REPLACE FUNCTION get_bill_hierarchy_path(bill_id UUID)
RETURNS TABLE(
    ledger_entry_title VARCHAR(255),
    ledger_subgroup_title VARCHAR(255),
    bill_vendor VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        le.title as ledger_entry_title,
        ls.title as ledger_subgroup_title,
        b.vendor_name as bill_vendor
    FROM bills b
    LEFT JOIN ledger_entries le ON b.ledger_entry_id = le.id
    LEFT JOIN ledger_subgroups ls ON b.ledger_subgroup_id = ls.id
    LEFT JOIN ledger_entries le2 ON ls.ledger_entry_id = le2.id
    WHERE b.id = bill_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_bill_hierarchy_path(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_bill_hierarchy_path(UUID) TO authenticated;