import { NextRequest, NextResponse } from 'next/server'
import { createOnlineGivingPayment } from '@/lib/online-giving'
import { createAdminClient } from '@/lib/supabase-server'
import { isDemoMode } from '@/lib/demo/config'
import { DEMO_CHURCH_ID } from '@/lib/demo/constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const churchId = String(body.churchId ?? '')
    const amount = Number(body.amount)
    const donorName = String(body.donorName ?? '').trim()
    const donorEmail = body.donorEmail ? String(body.donorEmail).trim() : undefined
    const fundType = body.fundType ? String(body.fundType) : 'general'
    const notes = body.notes ? String(body.notes) : undefined

    if (!churchId) {
      return NextResponse.json({ error: 'churchId is required' }, { status: 400 })
    }

    if (!donorName) {
      return NextResponse.json({ error: 'donorName is required' }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    if (!isDemoMode()) {
      const supabase = createAdminClient()
      const { data: church, error } = await supabase
        .from('churches')
        .select('id, name, is_active')
        .eq('id', churchId)
        .maybeSingle()

      if (error || !church) {
        return NextResponse.json({ error: 'Church not found' }, { status: 404 })
      }

      if (church.is_active === false) {
        return NextResponse.json({ error: 'This church is not accepting online gifts' }, { status: 403 })
      }
    } else if (churchId !== DEMO_CHURCH_ID) {
      return NextResponse.json(
        { error: 'Use the demo church ID in demo mode' },
        { status: 400 }
      )
    }

    const result = await createOnlineGivingPayment({
      churchId,
      amount,
      donorName,
      donorEmail,
      fundType,
      notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Online giving API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
