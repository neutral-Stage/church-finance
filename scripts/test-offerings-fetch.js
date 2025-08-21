import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client (same as frontend)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testOfferingsFetch() {
  console.log('🧪 Testing offerings fetch (same as frontend)...');
  
  try {
    // Test the same query structure as the frontend
    const { data: offerings, error: offeringsError } = await supabase
      .from('offerings')
      .select(`
        *,
        offering_member:offering_member(
          id,
          member:members(
            id,
            name
          )
        )
      `)
      .order('service_date', { ascending: false });
    
    if (offeringsError) {
      console.error('❌ Error fetching offerings:', offeringsError);
      return;
    }
    
    console.log(`✅ Successfully fetched ${offerings?.length || 0} offerings`);
    
    if (offerings && offerings.length > 0) {
      console.log('\n📋 Sample offering data:');
      console.log(JSON.stringify(offerings[0], null, 2));
    }
    
    // Test funds fetch
    const { data: fundsData, error: fundsError } = await supabase
      .from('funds')
      .select('*')
      .order('name');
    
    if (fundsError) {
      console.error('❌ Error fetching funds:', fundsError);
      return;
    }
    
    console.log(`\n✅ Successfully fetched ${fundsData?.length || 0} funds`);
    if (fundsData && fundsData.length > 0) {
      console.log('📋 Available funds:', fundsData.map(f => f.name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testOfferingsFetch().then(() => {
  console.log('\n🎉 Test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});