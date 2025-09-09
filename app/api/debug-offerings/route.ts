import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    
    // Process the data same as main page
     const processedOfferings = offerings?.map(offering => {
      
      // Convert array to single object (same logic as main page)
      const processedOffering = {
        ...offering,
        offering_member: Array.isArray(offering.offering_member) && offering.offering_member.length > 0
          ? offering.offering_member[0]
          : null
      }
      
      return processedOffering
    }) || []
    
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
    
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}