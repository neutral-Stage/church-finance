-- Reconciliation Schema

-- Sessions table
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    statement_start_date DATE,
    statement_end_date DATE,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank statement items (parsed from CSV)
CREATE TABLE IF NOT EXISTS bank_statement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    match_status VARCHAR(20) DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'created')),
    matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- Link to existing transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_items ENABLE ROW LEVEL SECURITY;

-- Policies for reconciliation_sessions
CREATE POLICY "Users can view reconciliation sessions for their church" 
    ON reconciliation_sessions FOR SELECT 
    USING (church_id IN (
        SELECT church_id FROM user_church_roles 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Treasurers can manage reconciliation sessions" 
    ON reconciliation_sessions FOR ALL 
    USING (church_id IN (
        SELECT church_id FROM user_church_roles 
        WHERE user_id = auth.uid() 
        AND role_id IN (SELECT id FROM roles WHERE name IN ('treasurer', 'admin'))
        AND is_active = true
    ));

-- Policies for bank_statement_items
CREATE POLICY "Users can view statement items for their church" 
    ON bank_statement_items FOR SELECT 
    USING (session_id IN (
        SELECT id FROM reconciliation_sessions 
        WHERE church_id IN (
            SELECT church_id FROM user_church_roles 
            WHERE user_id = auth.uid() AND is_active = true
        )
    ));

CREATE POLICY "Treasurers can manage statement items" 
    ON bank_statement_items FOR ALL 
    USING (session_id IN (
        SELECT id FROM reconciliation_sessions 
        WHERE church_id IN (
            SELECT church_id FROM user_church_roles 
            WHERE user_id = auth.uid() 
            AND role_id IN (SELECT id FROM roles WHERE name IN ('treasurer', 'admin'))
            AND is_active = true
        )
    ));
