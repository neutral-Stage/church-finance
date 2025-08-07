-- Fix RLS policies by dropping existing ones and recreating them
-- This migration resolves 42501 permission errors by ensuring clean policy creation

-- Drop existing policies if they exist (using IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "authenticated_users_can_select_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_users_can_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_users_can_update_transactions" ON transactions;
DROP POLICY IF EXISTS "authenticated_users_can_delete_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_users_can_select_transactions" ON transactions;

DROP POLICY IF EXISTS "authenticated_users_can_select_offerings" ON offerings;
DROP POLICY IF EXISTS "authenticated_users_can_insert_offerings" ON offerings;
DROP POLICY IF EXISTS "authenticated_users_can_update_offerings" ON offerings;
DROP POLICY IF EXISTS "authenticated_users_can_delete_offerings" ON offerings;
DROP POLICY IF EXISTS "anon_users_can_select_offerings" ON offerings;

DROP POLICY IF EXISTS "authenticated_users_can_select_bills" ON bills;
DROP POLICY IF EXISTS "authenticated_users_can_insert_bills" ON bills;
DROP POLICY IF EXISTS "authenticated_users_can_update_bills" ON bills;
DROP POLICY IF EXISTS "authenticated_users_can_delete_bills" ON bills;
DROP POLICY IF EXISTS "anon_users_can_select_bills" ON bills;

DROP POLICY IF EXISTS "authenticated_users_can_select_advances" ON advances;
DROP POLICY IF EXISTS "authenticated_users_can_insert_advances" ON advances;
DROP POLICY IF EXISTS "authenticated_users_can_update_advances" ON advances;
DROP POLICY IF EXISTS "authenticated_users_can_delete_advances" ON advances;
DROP POLICY IF EXISTS "anon_users_can_select_advances" ON advances;

DROP POLICY IF EXISTS "authenticated_users_can_select_petty_cash" ON petty_cash;
DROP POLICY IF EXISTS "authenticated_users_can_insert_petty_cash" ON petty_cash;
DROP POLICY IF EXISTS "authenticated_users_can_update_petty_cash" ON petty_cash;
DROP POLICY IF EXISTS "authenticated_users_can_delete_petty_cash" ON petty_cash;
DROP POLICY IF EXISTS "anon_users_can_select_petty_cash" ON petty_cash;

-- Now create the policies fresh
-- RLS policies for transactions table
CREATE POLICY "authenticated_users_can_select_transactions" ON transactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_transactions" ON transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_transactions" ON transactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_transactions" ON transactions
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS policies for offerings table
CREATE POLICY "authenticated_users_can_select_offerings" ON offerings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_offerings" ON offerings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_offerings" ON offerings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_offerings" ON offerings
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS policies for bills table
CREATE POLICY "authenticated_users_can_select_bills" ON bills
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_bills" ON bills
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_bills" ON bills
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_bills" ON bills
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS policies for advances table
CREATE POLICY "authenticated_users_can_select_advances" ON advances
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_advances" ON advances
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_advances" ON advances
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_advances" ON advances
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS policies for petty_cash table
CREATE POLICY "authenticated_users_can_select_petty_cash" ON petty_cash
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_petty_cash" ON petty_cash
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_petty_cash" ON petty_cash
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_petty_cash" ON petty_cash
    FOR DELETE
    TO authenticated
    USING (true);

-- Also add policies for anon users to read data (for public access)
CREATE POLICY "anon_users_can_select_transactions" ON transactions
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "anon_users_can_select_offerings" ON offerings
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "anon_users_can_select_bills" ON bills
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "anon_users_can_select_advances" ON advances
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "anon_users_can_select_petty_cash" ON petty_cash
    FOR SELECT
    TO anon
    USING (true);

-- Ensure all tables have RLS enabled (should already be enabled from initial schema)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;