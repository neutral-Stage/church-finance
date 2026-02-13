-- RLS Policy Validation Script
-- This script tests the church-based data isolation policies
-- Run this after applying the main migration to verify security

-- Test 1: Verify helper functions work correctly
SELECT 'Testing helper functions...' as test_section;

-- Test user_has_church_access function
DO $$
BEGIN
    -- This should work without causing recursion
    RAISE NOTICE 'Helper function user_has_church_access: %',
        user_has_church_access('00000000-0000-0000-0000-000000000000'::uuid,
                               '00000000-0000-0000-0000-000000000000'::uuid);

    RAISE NOTICE 'Helper function user_is_super_admin: %',
        user_is_super_admin('00000000-0000-0000-0000-000000000000'::uuid);

    RAISE NOTICE 'Helper functions work without recursion ✓';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Helper functions failed: %', SQLERRM;
END $$;

-- Test 2: Verify RLS is enabled on all critical tables
SELECT 'Checking RLS status on all tables...' as test_section;

SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'churches', 'roles', 'user_church_roles', 'funds',
    'transactions', 'offerings', 'bills', 'advances',
    'petty_cash', 'members', 'offering_member',
    'notifications', 'ledger_entries'
)
ORDER BY tablename;

-- Test 3: Verify church_id columns exist on tables that need them
SELECT 'Checking church_id columns...' as test_section;

SELECT
    t.table_name,
    CASE
        WHEN c.column_name IS NOT NULL THEN 'HAS church_id ✓'
        ELSE 'MISSING church_id ✗'
    END as church_id_status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON (
    t.table_name = c.table_name
    AND c.column_name = 'church_id'
    AND c.table_schema = 'public'
)
WHERE t.table_schema = 'public'
AND t.table_name IN (
    'funds', 'petty_cash', 'members', 'ledger_entries', 'notifications'
)
ORDER BY t.table_name;

-- Test 4: Check policy counts per table
SELECT 'Checking policy coverage...' as test_section;

SELECT
    schemaname,
    tablename,
    policyname,
    cmd as command_type,
    CASE
        WHEN qual IS NOT NULL AND with_check IS NOT NULL THEN 'USING + WITH CHECK'
        WHEN qual IS NOT NULL THEN 'USING only'
        WHEN with_check IS NOT NULL THEN 'WITH CHECK only'
        ELSE 'NO CONDITIONS'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'churches', 'roles', 'user_church_roles', 'funds',
    'transactions', 'offerings', 'bills', 'advances',
    'petty_cash', 'members', 'offering_member',
    'notifications', 'ledger_entries'
)
ORDER BY tablename, cmd, policyname;

-- Test 5: Verify no overly permissive policies exist
SELECT 'Checking for overly permissive policies...' as test_section;

SELECT
    schemaname,
    tablename,
    policyname,
    'Potentially permissive policy' as warning
FROM pg_policies
WHERE schemaname = 'public'
AND (
    -- Check for policies that allow everything
    LOWER(qual::text) LIKE '%true%'
    OR LOWER(with_check::text) LIKE '%true%'
    -- Check for policies that only check authentication
    OR (LOWER(qual::text) LIKE '%auth.uid()%is not null%' AND LENGTH(qual::text) < 50)
    OR (LOWER(with_check::text) LIKE '%auth.uid()%is not null%' AND LENGTH(with_check::text) < 50)
)
AND tablename IN (
    'churches', 'funds', 'transactions', 'offerings', 'bills',
    'advances', 'petty_cash', 'members', 'offering_member',
    'ledger_entries'  -- Notifications can have some permissive policies for system inserts
)
ORDER BY tablename, policyname;

-- Test 6: Create test data for isolation testing
SELECT 'Creating test data for isolation testing...' as test_section;

-- Insert test churches
INSERT INTO churches (id, name, type, description, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Church A', 'church', 'Test church A for isolation testing', true),
    ('22222222-2222-2222-2222-222222222222', 'Test Church B', 'church', 'Test church B for isolation testing', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Insert test funds for each church
INSERT INTO funds (id, name, church_id, current_balance, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Fund A1', '11111111-1111-1111-1111-111111111111', 1000.00, true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Fund B1', '22222222-2222-2222-2222-222222222222', 2000.00, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    church_id = EXCLUDED.church_id;

-- Test 7: Verify data isolation (this test needs to be run with different user contexts)
SELECT 'Data isolation test setup complete.' as test_section;
SELECT 'To test isolation:' as instruction;
SELECT '1. Create test users and assign them to different churches' as step1;
SELECT '2. Run queries as each user to verify they only see their church data' as step2;
SELECT '3. Verify super admins can see all data' as step3;

-- Test 8: Performance check on key queries
SELECT 'Testing query performance with RLS...' as test_section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT f.*, c.name as church_name
FROM funds f
JOIN churches c ON f.church_id = c.id
WHERE f.is_active = true;

EXPLAIN (ANALYZE, BUFFERS)
SELECT t.*, f.name as fund_name, c.name as church_name
FROM transactions t
JOIN funds f ON t.fund_id = f.id
JOIN churches c ON f.church_id = c.id
ORDER BY t.transaction_date DESC
LIMIT 100;

-- Test 9: Verify foreign key relationships are maintained
SELECT 'Checking foreign key constraints...' as test_section;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'funds', 'transactions', 'bills', 'advances',
        'petty_cash', 'members', 'ledger_entries'
    )
    AND ccu.column_name = 'id'
    AND ccu.table_name IN ('churches', 'funds')
ORDER BY tc.table_name, kcu.column_name;

-- Test 10: Summary report
SELECT 'RLS POLICY VALIDATION SUMMARY' as final_report;
SELECT '================================' as separator;

SELECT
    COUNT(*) as total_tables_with_rls,
    COUNT(*) FILTER (WHERE rowsecurity = true) as tables_rls_enabled,
    COUNT(*) FILTER (WHERE rowsecurity = false) as tables_rls_disabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'churches', 'roles', 'user_church_roles', 'funds',
    'transactions', 'offerings', 'bills', 'advances',
    'petty_cash', 'members', 'offering_member',
    'notifications', 'ledger_entries'
);

SELECT
    COUNT(*) as total_policies_created
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'churches', 'roles', 'user_church_roles', 'funds',
    'transactions', 'offerings', 'bills', 'advances',
    'petty_cash', 'members', 'offering_member',
    'notifications', 'ledger_entries'
);

SELECT 'Validation complete. Review results above.' as completion_message;
SELECT 'If any tests show errors or warnings, investigate before going to production.' as warning;