-- Create Ledger Subgroups System
-- This migration creates the ledger subgroups table for nested organization within ledger entries

-- Create ledger_subgroups table
CREATE TABLE ledger_subgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id UUID NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    purpose VARCHAR(500), -- Defined purpose/description for the subgroup
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (total_amount >= 0),
    default_due_date DATE DEFAULT CURRENT_DATE, -- Default billing date (editable)
    default_fund_id UUID REFERENCES funds(id),
    responsible_parties TEXT[], -- Optional responsible parties field
    allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    sort_order INTEGER DEFAULT 0, -- For maintaining display order
    notes TEXT,
    metadata JSONB DEFAULT '{}', -- For flexible additional data
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ledger_subgroups
CREATE INDEX idx_ledger_subgroups_ledger_entry_id ON ledger_subgroups(ledger_entry_id);
CREATE INDEX idx_ledger_subgroups_status ON ledger_subgroups(status);
CREATE INDEX idx_ledger_subgroups_default_due_date ON ledger_subgroups(default_due_date);
CREATE INDEX idx_ledger_subgroups_priority ON ledger_subgroups(priority);
CREATE INDEX idx_ledger_subgroups_sort_order ON ledger_subgroups(sort_order);
CREATE INDEX idx_ledger_subgroups_created_at ON ledger_subgroups(created_at DESC);
CREATE INDEX idx_ledger_subgroups_responsible_parties ON ledger_subgroups USING GIN(responsible_parties);
CREATE INDEX idx_ledger_subgroups_metadata ON ledger_subgroups USING GIN(metadata);

-- Function to update ledger subgroup total amount
CREATE OR REPLACE FUNCTION update_ledger_subgroup_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_amount based on associated bills
    IF TG_TABLE_NAME = 'bills' THEN
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
        
        -- Handle old ledger subgroup if bill was moved
        IF TG_OP = 'UPDATE' AND OLD.ledger_subgroup_id IS NOT NULL AND OLD.ledger_subgroup_id != NEW.ledger_subgroup_id THEN
            UPDATE ledger_subgroups 
            SET total_amount = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM bills 
                WHERE ledger_subgroup_id = OLD.ledger_subgroup_id
            ),
            updated_at = NOW()
            WHERE id = OLD.ledger_subgroup_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update parent ledger entry when subgroup changes
CREATE OR REPLACE FUNCTION update_parent_ledger_entry_from_subgroup()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent ledger entry total when subgroup total changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE ledger_entries 
        SET total_amount = (
            SELECT COALESCE(SUM(ls.total_amount), 0) + COALESCE(SUM(b.amount), 0)
            FROM ledger_subgroups ls
            FULL OUTER JOIN bills b ON b.ledger_entry_id = NEW.ledger_entry_id AND b.ledger_subgroup_id IS NULL
            WHERE ls.ledger_entry_id = NEW.ledger_entry_id
        ),
        updated_at = NOW()
        WHERE id = NEW.ledger_entry_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ledger_entries 
        SET total_amount = (
            SELECT COALESCE(SUM(ls.total_amount), 0) + COALESCE(SUM(b.amount), 0)
            FROM ledger_subgroups ls
            FULL OUTER JOIN bills b ON b.ledger_entry_id = OLD.ledger_entry_id AND b.ledger_subgroup_id IS NULL
            WHERE ls.ledger_entry_id = OLD.ledger_entry_id
        ),
        updated_at = NOW()
        WHERE id = OLD.ledger_entry_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at timestamp
CREATE TRIGGER trigger_ledger_subgroups_updated_at
    BEFORE UPDATE ON ledger_subgroups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating parent ledger entry totals
CREATE TRIGGER trigger_update_parent_ledger_entry_from_subgroup
    AFTER INSERT OR UPDATE OR DELETE ON ledger_subgroups
    FOR EACH ROW EXECUTE FUNCTION update_parent_ledger_entry_from_subgroup();

-- Enable Row Level Security
ALTER TABLE ledger_subgroups ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON ledger_subgroups TO anon;
GRANT ALL PRIVILEGES ON ledger_subgroups TO authenticated;

-- Create RLS policies
CREATE POLICY "Users can view all ledger subgroups" ON ledger_subgroups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ledger subgroups" ON ledger_subgroups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ledger subgroups" ON ledger_subgroups
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ledger subgroups" ON ledger_subgroups
    FOR DELETE USING (auth.role() = 'authenticated');

-- Constraint to ensure allocation percentages don't exceed 100% per ledger entry
CREATE OR REPLACE FUNCTION check_allocation_percentage_constraint()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total allocation percentage for the ledger entry
    SELECT COALESCE(SUM(allocation_percentage), 0) INTO total_percentage
    FROM ledger_subgroups 
    WHERE ledger_entry_id = NEW.ledger_entry_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Add the new/updated percentage
    total_percentage := total_percentage + COALESCE(NEW.allocation_percentage, 0);
    
    -- Check if total exceeds 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total allocation percentage cannot exceed 100%% for ledger entry. Current total would be: %', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for allocation percentage constraint
CREATE TRIGGER trigger_check_allocation_percentage
    BEFORE INSERT OR UPDATE ON ledger_subgroups
    FOR EACH ROW EXECUTE FUNCTION check_allocation_percentage_constraint();