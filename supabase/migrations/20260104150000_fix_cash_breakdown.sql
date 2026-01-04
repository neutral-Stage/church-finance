-- Create a normalized table for cash denominations to match frontend expectations
CREATE TABLE IF NOT EXISTS cash_denominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    fund_type VARCHAR(100) NOT NULL, -- Storing as text to match frontend 'Mission Fund' etc for now, ideally should link to funds table
    denomination INTEGER NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_church_fund_denom UNIQUE (church_id, fund_type, denomination)
);

-- Add RLS policies
ALTER TABLE cash_denominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash denominations for their church" 
    ON cash_denominations FOR SELECT 
    USING (church_id IN (
        SELECT church_id FROM user_church_roles 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Treasurers and Admins can manage cash denominations" 
    ON cash_denominations FOR ALL 
    USING (church_id IN (
        SELECT church_id FROM user_church_roles 
        WHERE user_id = auth.uid() 
        AND role_id IN (SELECT id FROM roles WHERE name IN ('treasurer', 'admin'))
        AND is_active = true
    ));
