-- Check current RLS policies on funds table
-- DROP any existing policies that might be blocking access
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."funds";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."funds";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."funds";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."funds";

-- Create new policies that allow proper access
CREATE POLICY "Allow public read access to funds" ON "public"."funds"
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage funds" ON "public"."funds"
    FOR ALL USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON "public"."funds" TO "anon";
GRANT ALL ON "public"."funds" TO "authenticated";