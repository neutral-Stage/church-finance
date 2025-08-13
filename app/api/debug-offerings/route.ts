import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    console.log('=== DEBUG OFFERINGS API CALLED ===')
    
    // Fetch offerings with member relationships - same query as the main page
    const { data: offerings, error } = await supabase
      .from('offerings')
      .select(`
        *,
        offering_member(
          member:members(*)
        )
      `)
      .order('service_date', { ascending: false })
    
    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('=== RAW SUPABASE RESPONSE ===')
    console.log('Total offerings returned:', offerings?.length || 0)
    console.log('Raw data structure:', JSON.stringify(offerings, null, 2))
    
    // Process the data same as main page
    const processedOfferings = offerings?.map(offering => {
      console.log(`\n=== PROCESSING OFFERING ${offering.id} ===`)
      console.log('Raw offering_member:', offering.offering_member)
      console.log('offering_member type:', typeof offering.offering_member)
      console.log('offering_member is array:', Array.isArray(offering.offering_member))
      
      if (Array.isArray(offering.offering_member)) {
        console.log('offering_member array length:', offering.offering_member.length)
        if (offering.offering_member.length > 0) {
          console.log('First offering_member item:', offering.offering_member[0])
          console.log('Member data in first item:', offering.offering_member[0]?.member)
        }
      }
      
      // Convert array to single object (same logic as main page)
      const processedOffering = {
        ...offering,
        offering_member: Array.isArray(offering.offering_member) && offering.offering_member.length > 0
          ? offering.offering_member[0]
          : null
      }
      
      console.log('Processed offering_member:', processedOffering.offering_member)
      console.log('Final member name:', processedOffering.offering_member?.member?.name)
      
      return processedOffering
    }) || []
    
    console.log('\n=== FINAL PROCESSED DATA ===')
    processedOfferings.forEach(offering => {
      console.log(`Offering ${offering.id}: Member = ${offering.offering_member?.member?.name || 'NO MEMBER'}`)
    })
    
    return NextResponse.json({
      success: true,
      totalOfferings: offerings?.length || 0,
      processedOfferings: processedOfferings.map(o => ({
        id: o.id,
        service_date: o.service_date,
        type: o.type,
        amount: o.amount,
        member_name: o.offering_member?.member?.name || null,
        member_data: o.offering_member?.member || null,
        raw_offering_member: o.offering_member
      }))
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}