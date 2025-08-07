-- Church Finance Management App - Initial Database Schema
-- This migration creates all tables, indexes, RLS policies, triggers, and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create funds table
CREATE TABLE funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL CHECK (name IN ('Management', 'Mission', 'Building')),
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for funds
CREATE INDEX idx_funds_name ON funds(name);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create indexes for transactions
CREATE INDEX idx_transactions_fund_id ON transactions(fund_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);

-- Create offerings table
CREATE TABLE offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('tithe', 'lords_day', 'special', 'mission')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    service_date DATE NOT NULL,
    contributors_count INTEGER CHECK (contributors_count >= 0),
    fund_allocations JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for offerings
CREATE INDEX idx_offerings_service_date ON offerings(service_date DESC);
CREATE INDEX idx_offerings_type ON offerings(type);
CREATE INDEX idx_offerings_fund_allocations ON offerings USING GIN(fund_allocations);

-- Create bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one-time', 'monthly', 'quarterly', 'yearly')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    category VARCHAR(100) NOT NULL,
    fund_id UUID NOT NULL REFERENCES funds(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for bills
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_fund_id ON bills(fund_id);

-- Create advances table
CREATE TABLE advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create indexes for advances
CREATE INDEX idx_advances_status ON advances(status);
CREATE INDEX idx_advances_fund_id ON advances(fund_id);
CREATE INDEX idx_advances_expected_return ON advances(expected_return_date);

-- Create petty_cash table
CREATE TABLE petty_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    purpose VARCHAR(500) NOT NULL,
    transaction_date DATE NOT NULL,
    approved_by VARCHAR(255) NOT NULL,
    receipt_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for petty_cash
CREATE INDEX idx_petty_cash_date ON petty_cash(transaction_date DESC);
CREATE INDEX idx_petty_cash_approved_by ON petty_cash(approved_by);

-- Function to update fund balance
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

-- Trigger for automatic fund balance updates
CREATE TRIGGER trigger_update_fund_balance
    AFTER INSERT OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_fund_balance();

-- Function to update fund balance from offerings
CREATE OR REPLACE FUNCTION update_fund_balance_from_offerings()
RETURNS TRIGGER AS $$
DECLARE
    allocation JSONB;
    fund_allocation RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Process fund allocations from the JSONB field
        FOR fund_allocation IN
            SELECT key as fund_name, value::numeric as amount
            FROM jsonb_each_text(NEW.fund_allocations)
        LOOP
            UPDATE funds 
            SET current_balance = current_balance + fund_allocation.amount 
            WHERE name = fund_allocation.fund_name;
        END LOOP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse fund allocations
        FOR fund_allocation IN
            SELECT key as fund_name, value::numeric as amount
            FROM jsonb_each_text(OLD.fund_allocations)
        LOOP
            UPDATE funds 
            SET current_balance = current_balance - fund_allocation.amount 
            WHERE name = fund_allocation.fund_name;
        END LOOP;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic fund balance updates from offerings
CREATE TRIGGER trigger_update_fund_balance_from_offerings
    AFTER INSERT OR DELETE ON offerings
    FOR EACH ROW EXECUTE FUNCTION update_fund_balance_from_offerings();

-- Enable Row Level Security on all tables
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON funds TO anon;
GRANT ALL PRIVILEGES ON funds TO authenticated;

GRANT SELECT ON transactions TO anon;
GRANT ALL PRIVILEGES ON transactions TO authenticated;

GRANT SELECT ON offerings TO anon;
GRANT ALL PRIVILEGES ON offerings TO authenticated;

GRANT SELECT ON bills TO anon;
GRANT ALL PRIVILEGES ON bills TO authenticated;

GRANT SELECT ON advances TO anon;
GRANT ALL PRIVILEGES ON advances TO authenticated;

GRANT SELECT ON petty_cash TO anon;
GRANT ALL PRIVILEGES ON petty_cash TO authenticated;

-- Insert initial fund data
INSERT INTO funds (name, current_balance) VALUES
('Management', 50000.00),
('Mission', 25000.00),
('Building', 75000.00);

-- Insert sample transactions
INSERT INTO transactions (type, amount, description, category, payment_method, fund_id, transaction_date, receipt_number) VALUES
('income', 5000.00, 'Monthly Tithes Collection', 'Tithes', 'bank', (SELECT id FROM funds WHERE name = 'Management'), CURRENT_DATE - INTERVAL '5 days', 'RCP001'),
('expense', 1200.00, 'Electricity Bill Payment', 'Utilities', 'bank', (SELECT id FROM funds WHERE name = 'Management'), CURRENT_DATE - INTERVAL '3 days', 'RCP002'),
('income', 2500.00, 'Special Offering for Mission', 'Offerings', 'cash', (SELECT id FROM funds WHERE name = 'Mission'), CURRENT_DATE - INTERVAL '2 days', 'RCP003'),
('expense', 800.00, 'Building Maintenance', 'Maintenance', 'cash', (SELECT id FROM funds WHERE name = 'Building'), CURRENT_DATE - INTERVAL '1 day', 'RCP004');

-- Insert sample offerings
INSERT INTO offerings (type, amount, service_date, contributors_count, fund_allocations, notes) VALUES
('tithe', 8500.00, CURRENT_DATE - INTERVAL '7 days', 45, '{"Management": 6000, "Mission": 1500, "Building": 1000}', 'Sunday morning service tithes'),
('lords_day', 3200.00, CURRENT_DATE - INTERVAL '7 days', 32, '{"Management": 2000, "Mission": 800, "Building": 400}', 'Lords Day offering'),
('special', 5000.00, CURRENT_DATE - INTERVAL '14 days', 28, '{"Mission": 5000}', 'Special mission offering for outreach program'),
('mission', 2800.00, CURRENT_DATE - INTERVAL '21 days', 22, '{"Mission": 2800}', 'Monthly mission support');

-- Insert sample bills
INSERT INTO bills (vendor_name, amount, due_date, frequency, status, category, fund_id) VALUES
('City Electric Company', 1200.00, CURRENT_DATE + INTERVAL '5 days', 'monthly', 'pending', 'Utilities', (SELECT id FROM funds WHERE name = 'Management')),
('Water Department', 450.00, CURRENT_DATE + INTERVAL '10 days', 'monthly', 'pending', 'Utilities', (SELECT id FROM funds WHERE name = 'Management')),
('Internet Service Provider', 89.99, CURRENT_DATE + INTERVAL '15 days', 'monthly', 'pending', 'Communications', (SELECT id FROM funds WHERE name = 'Management')),
('Building Insurance', 2500.00, CURRENT_DATE + INTERVAL '30 days', 'yearly', 'pending', 'Insurance', (SELECT id FROM funds WHERE name = 'Building')),
('Cleaning Supplies', 150.00, CURRENT_DATE - INTERVAL '2 days', 'one-time', 'overdue', 'Maintenance', (SELECT id FROM funds WHERE name = 'Management'));

-- Insert sample advances
INSERT INTO advances (recipient_name, amount, purpose, advance_date, expected_return_date, status, amount_returned, payment_method, fund_id, approved_by, notes) VALUES
('John Smith', 1000.00, 'Conference attendance advance', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'outstanding', 0.00, 'bank', (SELECT id FROM funds WHERE name = 'Management'), 'Pastor Williams', 'Leadership conference in neighboring city'),
('Mary Johnson', 500.00, 'Ministry supplies advance', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '5 days', 'partial', 200.00, 'cash', (SELECT id FROM funds WHERE name = 'Mission'), 'Treasurer Davis', 'Childrens ministry supplies'),
('David Brown', 750.00, 'Building repair materials', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '5 days', 'returned', 750.00, 'bank', (SELECT id FROM funds WHERE name = 'Building'), 'Pastor Williams', 'Emergency roof repair materials');

-- Insert sample petty cash transactions
INSERT INTO petty_cash (amount, purpose, transaction_date, approved_by, receipt_available) VALUES
(25.00, 'Office supplies - pens and paper', CURRENT_DATE - INTERVAL '2 days', 'Secretary Adams', true),
(45.00, 'Coffee and refreshments for meeting', CURRENT_DATE - INTERVAL '5 days', 'Pastor Williams', true),
(15.00, 'Parking fees for church event', CURRENT_DATE - INTERVAL '7 days', 'Treasurer Davis', false),
(35.00, 'Cleaning supplies for sanctuary', CURRENT_DATE - INTERVAL '10 days', 'Janitor Wilson', true);

-- Create view for fund summary with calculated totals
CREATE VIEW fund_summary AS
SELECT 
    f.id,
    f.name,
    f.current_balance,
    COALESCE(income_total.total, 0) as total_income,
    COALESCE(expense_total.total, 0) as total_expenses,
    COALESCE(offering_total.total, 0) as total_offerings,
    f.created_at
FROM funds f
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'income'
    GROUP BY fund_id
) income_total ON f.id = income_total.fund_id
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'expense'
    GROUP BY fund_id
) expense_total ON f.id = expense_total.fund_id
LEFT JOIN (
    SELECT 
        f2.id as fund_id,
        SUM((o.fund_allocations->>f2.name)::numeric) as total
    FROM offerings o
    CROSS JOIN funds f2
    WHERE o.fund_allocations ? f2.name
    GROUP BY f2.id
) offering_total ON f.id = offering_total.fund_id;

-- Grant access to the view
GRANT SELECT ON fund_summary TO anon;
GRANT SELECT ON fund_summary TO authenticated;