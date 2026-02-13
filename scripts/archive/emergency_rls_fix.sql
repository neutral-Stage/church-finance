-- Emergency RLS Fix - Temporarily disable problematic policies
-- Run this first to stop the infinite recursion, then apply the full migration

-- Temporarily disable RLS on tables causing recursion
ALTER TABLE user_church_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE funds DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE advances DISABLE ROW LEVEL SECURITY;

-- Keep basic security on critical tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create minimal policies for churches and roles
DROP POLICY IF EXISTS "allow_authenticated_churches" ON churches;
CREATE POLICY "allow_authenticated_churches" ON churches
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_authenticated_roles" ON roles;
CREATE POLICY "allow_authenticated_roles" ON roles
    FOR ALL USING (auth.uid() IS NOT NULL);