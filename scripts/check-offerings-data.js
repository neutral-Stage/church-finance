import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOfferingsData() {
  console.log('🔍 Checking database connection and offerings data...');
  
  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('funds')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful');
    
    // Check if offerings table has data
    console.log('\n2. Checking offerings table...');
    const { data: offerings, error: offeringsError } = await supabase
      .from('offerings')
      .select('*');
    
    if (offeringsError) {
      console.error('❌ Error querying offerings table:', offeringsError.message);
      return;
    }
    
    console.log(`📊 Found ${offerings.length} offerings in the table`);
    
    if (offerings.length === 0) {
      console.log('\n3. Inserting sample offerings data...');
      await insertSampleData();
    } else {
      console.log('\n✅ Offerings table already contains data:');
      offerings.forEach((offering, index) => {
        console.log(`   ${index + 1}. ${offering.type} - $${offering.amount} (${offering.service_date})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function insertSampleData() {
  try {
    // Get fund IDs first
    const { data: funds, error: fundsError } = await supabase
      .from('funds')
      .select('id, name');
    
    if (fundsError) {
      console.error('❌ Error fetching funds:', fundsError.message);
      return;
    }
    
    const fundMap = {};
    funds.forEach(fund => {
      fundMap[fund.name] = fund.id;
    });
    
    console.log('📋 Available funds:', Object.keys(fundMap).join(', '));
    
    // Sample offerings data based on the schema
    const sampleOfferings = [
      {
        type: 'Tithe',
        amount: 8500.00,
        service_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        contributors_count: 45,
        fund_allocations: {
          [fundMap.Management]: 6000,
          [fundMap.Mission]: 1500,
          [fundMap.Building]: 1000
        },
        notes: 'Sunday morning service tithes'
      },
      {
        type: "Lord's Day",
        amount: 3200.00,
        service_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        contributors_count: 32,
        fund_allocations: {
          [fundMap.Management]: 2000,
          [fundMap.Mission]: 800,
          [fundMap.Building]: 400
        },
        notes: 'Lords Day offering'
      },
      {
        type: 'Special Offering',
        amount: 5000.00,
        service_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days ago
        contributors_count: 28,
        fund_allocations: {
          [fundMap.Mission]: 5000
        },
        notes: 'Special mission offering for outreach program'
      },
      {
        type: 'Mission Fund Offering',
        amount: 2800.00,
        service_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 21 days ago
        contributors_count: 22,
        fund_allocations: {
          [fundMap.Mission]: 2800
        },
        notes: 'Monthly mission support'
      }
    ];
    
    // Insert sample offerings
    const { data: insertedOfferings, error: insertError } = await supabase
      .from('offerings')
      .insert(sampleOfferings)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting sample data:', insertError.message);
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedOfferings.length} sample offerings`);
    
    // Verify insertion
    console.log('\n4. Verifying inserted data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('offerings')
      .select('*')
      .order('service_date', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError.message);
      return;
    }
    
    console.log(`✅ Verification complete - ${verifyData.length} offerings now in table:`);
    verifyData.forEach((offering, index) => {
      console.log(`   ${index + 1}. ${offering.type} - $${offering.amount} (${offering.service_date})`);
    });
    
  } catch (error) {
    console.error('❌ Error in insertSampleData:', error.message);
  }
}

// Run the check
checkOfferingsData().then(() => {
  console.log('\n🎉 Database check complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});