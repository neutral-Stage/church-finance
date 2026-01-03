-- Church Finance Management App - Consolidated Schema Migration
-- This creates all tables, indexes, RLS policies, and functions for a fresh database
-- Run this in Supabase SQL Editor for a new project

-- ============================================
-- PART 0: CLEANUP (Safety for fresh install)
-- ============================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ============================================
-- PART 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- ============================================
-- PART 2: CORE TABLES (Churches, Roles, Users)
-- ============================================

-- Churches table (main organization)
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('church', 'fellowship', 'ministry')) DEFAULT 'church',
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_churches_name ON churches(name);
CREATE INDEX IF NOT EXISTS idx_churches_type ON churches(type);
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches(is_active);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User church roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_church_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, church_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_church_roles_user ON user_church_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_church_roles_church ON user_church_roles(church_id);
CREATE INDEX IF NOT EXISTS idx_user_church_roles_role ON user_church_roles(role_id);

-- Users table (profile data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('admin', 'treasurer', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    selected_church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
    theme VARCHAR(20) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 3: FINANCIAL TABLES
-- ============================================

-- Funds table
CREATE TABLE IF NOT EXISTS funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    fund_type VARCHAR(100),
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funds_church ON funds(church_id);
CREATE INDEX IF NOT EXISTS idx_funds_name ON funds(name);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('cash', 'bank')),
    fund_id UUID NOT NULL REFERENCES funds(id),
    transaction_date DATE NOT NULL,
    receipt_number VARCHAR(50),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_church ON transactions(church_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fund_id ON transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Offerings table
CREATE TABLE IF NOT EXISTS offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('tithe', 'lords_day', 'special', 'mission', 'thanksgiving', 'building', 'welfare', 'other')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    service_date DATE NOT NULL,
    contributors_count INTEGER CHECK (contributors_count >= 0),
    fund_allocations JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offerings_church ON offerings(church_id);
CREATE INDEX IF NOT EXISTS idx_offerings_service_date ON offerings(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_offerings_type ON offerings(type);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    membership_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_church ON members(church_id);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);

-- Offering members (junction table)
CREATE TABLE IF NOT EXISTS offering_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(offering_id, member_id)
);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_church ON ledger_entries(church_id);

-- Ledger subgroups
CREATE TABLE IF NOT EXISTS ledger_subgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id UUID NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_subgroups_entry ON ledger_subgroups(ledger_entry_id);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one-time', 'monthly', 'quarterly', 'yearly')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    category VARCHAR(100),
    fund_id UUID NOT NULL REFERENCES funds(id),
    ledger_entry_id UUID REFERENCES ledger_entries(id),
    ledger_subgroup_id UUID REFERENCES ledger_subgroups(id),
    responsible_parties TEXT[],
    allocation_percentage DECIMAL(5,2),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_church ON bills(church_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Advances table
CREATE TABLE IF NOT EXISTS advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    purpose VARCHAR(500) NOT NULL,
    advance_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'partial', 'returned')),
    amount_returned DECIMAL(12,2) DEFAULT 0.00 CHECK (amount_returned >= 0),
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('cash', 'bank')),
    fund_id UUID NOT NULL REFERENCES funds(id),
    approved_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advances_church ON advances(church_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);

-- Petty cash table
CREATE TABLE IF NOT EXISTS petty_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    purpose VARCHAR(500) NOT NULL,
    transaction_date DATE NOT NULL,
    approved_by VARCHAR(255) NOT NULL,
    receipt_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_church ON petty_cash(church_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_date ON petty_cash(transaction_date DESC);

-- Cash breakdown table
CREATE TABLE IF NOT EXISTS cash_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    breakdown_date DATE NOT NULL,
    denomination_1000 INTEGER DEFAULT 0,
    denomination_500 INTEGER DEFAULT 0,
    denomination_200 INTEGER DEFAULT 0,
    denomination_100 INTEGER DEFAULT 0,
    denomination_50 INTEGER DEFAULT 0,
    denomination_20 INTEGER DEFAULT 0,
    denomination_10 INTEGER DEFAULT 0,
    denomination_5 INTEGER DEFAULT 0,
    denomination_2 INTEGER DEFAULT 0,
    denomination_1 INTEGER DEFAULT 0,
    coins DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_breakdown_church ON cash_breakdown(church_id);
CREATE INDEX IF NOT EXISTS idx_cash_breakdown_date ON cash_breakdown(breakdown_date DESC);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_church ON notifications(church_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Document attachments
CREATE TABLE IF NOT EXISTS document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_church ON document_attachments(church_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_entity ON document_attachments(entity_type, entity_id);

-- ============================================
-- PART 4: AI TABLES (Vector Search)
-- ============================================

-- Document embeddings for vector search
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding extensions.vector(768),
    metadata JSONB DEFAULT '{}',
    source_table VARCHAR(100),
    source_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_church ON document_embeddings(church_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_source ON document_embeddings(source_table, source_id);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_church ON ai_conversations(church_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

-- AI messages
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);

-- ============================================
-- PART 5: INSERT DEFAULT ROLES
-- ============================================

INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES 
('super_admin', 'Super Administrator', 'Full system access across all churches', 
 '{
    "churches": {"create": true, "read": true, "update": true, "delete": true},
    "users": {"create": true, "read": true, "update": true, "delete": true},
    "roles": {"create": true, "read": true, "update": true, "delete": true},
    "funds": {"create": true, "read": true, "update": true, "delete": true},
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "offerings": {"create": true, "read": true, "update": true, "delete": true},
    "bills": {"create": true, "read": true, "update": true, "delete": true},
    "advances": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"create": true, "read": true, "update": true, "delete": true}
 }', true),
('church_admin', 'Church Administrator', 'Full access to assigned church operations', 
 '{
    "funds": {"create": true, "read": true, "update": true, "delete": true},
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "offerings": {"create": true, "read": true, "update": true, "delete": true},
    "bills": {"create": true, "read": true, "update": true, "delete": true},
    "advances": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"create": true, "read": true, "update": true, "delete": false},
    "members": {"create": true, "read": true, "update": true, "delete": true}
 }', true),
('treasurer', 'Treasurer', 'Financial management for assigned churches', 
 '{
    "funds": {"create": false, "read": true, "update": true, "delete": false},
    "transactions": {"create": true, "read": true, "update": true, "delete": false},
    "offerings": {"create": true, "read": true, "update": true, "delete": false},
    "bills": {"create": true, "read": true, "update": true, "delete": false},
    "advances": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"create": false, "read": true, "update": false, "delete": false}
 }', true),
('finance_viewer', 'Finance Viewer', 'Read-only access to financial data', 
 '{
    "funds": {"create": false, "read": true, "update": false, "delete": false},
    "transactions": {"create": false, "read": true, "update": false, "delete": false},
    "offerings": {"create": false, "read": true, "update": false, "delete": false},
    "bills": {"create": false, "read": true, "update": false, "delete": false},
    "advances": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"create": false, "read": true, "update": false, "delete": false}
 }', true),
('member', 'Member', 'Basic member access', 
 '{
    "offerings": {"create": false, "read": true, "update": false, "delete": false}
 }', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 6: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_church_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 7: RLS POLICIES
-- ============================================

-- Helper function to check user has access to church
CREATE OR REPLACE FUNCTION user_has_church_access(p_church_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Churches policies
CREATE POLICY "Users can view their churches" ON churches
    FOR SELECT USING (user_has_church_access(id));

CREATE POLICY "Admins can manage churches" ON churches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND ucr.church_id = churches.id
            AND r.name IN ('super_admin', 'church_admin')
            AND ucr.is_active = true
        )
    );

-- Roles policies
CREATE POLICY "Anyone can view roles" ON roles FOR SELECT USING (true);

-- User church roles policies
CREATE POLICY "Users can view their own roles" ON user_church_roles
    FOR SELECT USING (user_id = auth.uid() OR user_has_church_access(church_id));

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (user_id = auth.uid());

-- Generic policy for church-scoped tables
CREATE POLICY "Users can view church funds" ON funds
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church funds" ON funds
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church transactions" ON transactions
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church transactions" ON transactions
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church offerings" ON offerings
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church offerings" ON offerings
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church members" ON members
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church members" ON members
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view offering members" ON offering_member
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM offerings o WHERE o.id = offering_id AND user_has_church_access(o.church_id))
    );

CREATE POLICY "Users can manage offering members" ON offering_member
    FOR ALL USING (
        EXISTS (SELECT 1 FROM offerings o WHERE o.id = offering_id AND user_has_church_access(o.church_id))
    );

CREATE POLICY "Users can view church ledger entries" ON ledger_entries
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church ledger entries" ON ledger_entries
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view ledger subgroups" ON ledger_subgroups
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ledger_entries le WHERE le.id = ledger_entry_id AND user_has_church_access(le.church_id))
    );

CREATE POLICY "Users can manage ledger subgroups" ON ledger_subgroups
    FOR ALL USING (
        EXISTS (SELECT 1 FROM ledger_entries le WHERE le.id = ledger_entry_id AND user_has_church_access(le.church_id))
    );

CREATE POLICY "Users can view church bills" ON bills
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church bills" ON bills
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church advances" ON advances
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church advances" ON advances
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church petty cash" ON petty_cash
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church petty cash" ON petty_cash
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church cash breakdown" ON cash_breakdown
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church cash breakdown" ON cash_breakdown
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church notifications" ON notifications
    FOR SELECT USING (user_has_church_access(church_id) OR user_id = auth.uid());

CREATE POLICY "Users can view church documents" ON document_attachments
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church documents" ON document_attachments
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view church embeddings" ON document_embeddings
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage church embeddings" ON document_embeddings
    FOR ALL USING (user_has_church_access(church_id));

CREATE POLICY "Users can view own conversations" ON ai_conversations
    FOR SELECT USING (user_id = auth.uid() AND user_has_church_access(church_id));

CREATE POLICY "Users can manage own conversations" ON ai_conversations
    FOR ALL USING (user_id = auth.uid() AND user_has_church_access(church_id));

CREATE POLICY "Users can view conversation messages" ON ai_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
    );

CREATE POLICY "Users can insert messages" ON ai_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
    );

-- ============================================
-- PART 8: HELPER FUNCTIONS
-- ============================================

-- Function to update fund balance from transactions
CREATE OR REPLACE FUNCTION update_fund_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'income' THEN
            UPDATE funds SET current_balance = current_balance + NEW.amount WHERE id = NEW.fund_id;
        ELSE
            UPDATE funds SET current_balance = current_balance - NEW.amount WHERE id = NEW.fund_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'income' THEN
            UPDATE funds SET current_balance = current_balance - OLD.amount WHERE id = OLD.fund_id;
        ELSE
            UPDATE funds SET current_balance = current_balance + OLD.amount WHERE id = OLD.fund_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fund_balance
    AFTER INSERT OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_fund_balance();

-- Function to get user churches
CREATE OR REPLACE FUNCTION get_user_churches(p_user_id UUID)
RETURNS TABLE (
    church_id UUID,
    church_name VARCHAR,
    church_type VARCHAR,
    role_name VARCHAR,
    role_display_name VARCHAR,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as church_id,
        c.name as church_name,
        c.type as church_type,
        r.name as role_name,
        r.display_name as role_display_name,
        r.permissions
    FROM churches c
    JOIN user_church_roles ucr ON c.id = ucr.church_id
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = p_user_id
    AND ucr.is_active = true
    AND c.is_active = true
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search similar documents (vector search)
CREATE OR REPLACE FUNCTION search_similar_documents(
    query_embedding extensions.vector(768),
    p_church_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.content,
        de.metadata,
        1 - (de.embedding <=> query_embedding) as similarity
    FROM document_embeddings de
    WHERE de.church_id = p_church_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 9: GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- COMPLETED!
-- ============================================
