// Test script to check offering member data structure
import { createClient } from '@supabase/supabase-js'

// Supabase credentials
const supabaseUrl = 'https://apfjyghvbkgucylipmdf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZmp5Z2h2YmtndWN5bGlwbWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDM4MzAsImV4cCI6MjA3MDExOTgzMH0.8OGHNozfSwuOcA-n08C0k6oUHwg3GVIPfxkCn1FzvDA'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOfferingData() {
  console.log('Testing offering data structure...')
  
  // Test the exact query used in the app
  const { data: offerings, error } = await supabase
    .from('offerings')
    .select(`
      *,
      offering_member(
        member:members(*)
      )
    `)
    .order('service_date', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error fetching offerings:', error)
    return
  }
  
  console.log('Offerings data:')
  console.log(JSON.stringify(offerings, null, 2))
  
  // Check each offering's member data
  offerings?.forEach((offering, index) => {
    console.log(`\nOffering ${index + 1} (ID: ${offering.id}):`)
    console.log('- offering_member:', offering.offering_member)
    
    if (offering.offering_member) {
      console.log('- member data:', offering.offering_member.member)
    } else {
      console.log('- No offering_member found')
    }
  })
}

testOfferingData().catch(console.error)