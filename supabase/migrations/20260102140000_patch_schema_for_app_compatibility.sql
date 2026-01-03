-- Add missing columns to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add missing columns to members
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS fellowship_name VARCHAR(100);

-- Add missing columns to document_attachments
ALTER TABLE document_attachments 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to funds
ALTER TABLE funds 
ADD COLUMN IF NOT EXISTS target_amount DECIMAL(12,2);

-- Add missing columns to ledger_entries
ALTER TABLE ledger_entries 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS default_due_date DATE,
ADD COLUMN IF NOT EXISTS responsible_parties TEXT[],
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0.00;

-- Add missing columns to ledger_subgroups
ALTER TABLE ledger_subgroups 
ADD COLUMN IF NOT EXISTS allocation_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS default_due_date DATE;

-- Create fund_summary view
CREATE OR REPLACE VIEW fund_summary AS
SELECT 
    f.id,
    f.church_id,
    f.name,
    f.fund_type,
    f.current_balance,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses
FROM funds f
LEFT JOIN transactions t ON f.id = t.fund_id
GROUP BY f.id;
