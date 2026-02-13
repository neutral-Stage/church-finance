-- Debug script to investigate church filtering issues
-- Run this in your Supabase SQL editor to diagnose the problem

-- =====================================================================================
-- STEP 1: Check RLS Status
-- =====================================================================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('funds', 'churches', 'user_church_roles', 'transactions')
ORDER BY tablename;

-- =====================================================================================
-- STEP 2: Check Active RLS Policies
-- =====================================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('funds', 'churches', 'user_church_roles')
ORDER BY tablename, policyname;

-- =====================================================================================
-- STEP 3: Check Data Integrity
-- =====================================================================================

-- Check all churches in the system
SELECT
    id,
    name,
    type,
    is_active,
    created_at
FROM churches
ORDER BY name;

-- Check all funds and their church associations
SELECT
    f.id,
    f.name as fund_name,
    f.church_id,
    c.name as church_name,
    f.current_balance,
    f.is_active as fund_active,
    c.is_active as church_active
FROM funds f
LEFT JOIN churches c ON f.church_id = c.id
ORDER BY c.name, f.name;

-- Check user-church role assignments
SELECT
    ucr.user_id,
    u.email as user_email,
    c.name as church_name,
    r.name as role_name,
    ucr.is_active,
    ucr.expires_at
FROM user_church_roles ucr
JOIN churches c ON ucr.church_id = c.id
JOIN roles r ON ucr.role_id = r.id
LEFT JOIN auth.users u ON ucr.user_id = u.id
WHERE ucr.is_active = true
ORDER BY u.email, c.name;

-- =====================================================================================
-- STEP 4: Test Functions
-- =====================================================================================

-- Test get_user_churches function (replace with actual user ID)
-- SELECT * FROM get_user_churches('USER_ID_HERE');

-- Test access functions (replace with actual IDs)
-- SELECT user_has_church_access('USER_ID_HERE', 'CHURCH_ID_HERE');
-- SELECT user_is_super_admin('USER_ID_HERE');

-- =====================================================================================
-- STEP 5: Test Direct Queries with RLS
-- =====================================================================================

-- This will show what the current user can see with RLS enabled
-- Run this as an authenticated user in Supabase
-- SELECT id, name, church_id FROM funds;
-- SELECT id, name FROM churches;

-- =====================================================================================
-- STEP 6: Check for Bypass Conditions
-- =====================================================================================

-- Check if any policies are too permissive
SELECT
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND (
        qual LIKE '%true%'
        OR qual LIKE '%1=1%'
        OR qual IS NULL
    );

-- =====================================================================================
-- STEP 7: Identify Problem Areas
-- =====================================================================================

-- Check for funds without church_id (orphaned data)
SELECT
    id,
    name,
    church_id,
    current_balance
FROM funds
WHERE church_id IS NULL;

-- Check for missing foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('funds', 'transactions', 'bills', 'advances')
  AND kcu.column_name = 'church_id';

-- =====================================================================================
-- RECOMMENDED ACTIONS BASED ON RESULTS:
-- =====================================================================================

/*
1. If RLS is disabled on critical tables:
   - Run: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

2. If policies are missing or too permissive:
   - Review and update RLS policies

3. If funds have NULL church_id:
   - Update orphaned records to belong to a default church

4. If user has no church roles:
   - Assign user to appropriate church with proper role

5. If functions are not working:
   - Check function permissions and logic

6. If queries bypass RLS:
   - Investigate application-level issues with service role usage
*/