require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Using anon key + service role is safer to inspect anything, but let's use service key if available
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function main() {
  const userId = '7de952bb-4351-48a1-9de2-b7a386a6c302';
  
  console.log("Checking user roles for:", userId);
  
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_church_roles')
    .select(`
      id,
      church_id,
      role_id,
      is_active,
      expires_at,
      roles (
        id,
        name,
        is_active
      )
    `)
    .eq('user_id', userId);
    
  console.log("User roles:", JSON.stringify(rolesData, null, 2));
  if (rolesError) console.error("Error:", rolesError);

  // Check the postgres function
  const { data: isSuper, error: isSuperError } = await supabase.rpc('user_is_super_admin', { p_user_id: userId });
  console.log("user_is_super_admin returns:", isSuper);
  if (isSuperError) console.error("Error executing function:", isSuperError);
}

main().catch(console.error);
