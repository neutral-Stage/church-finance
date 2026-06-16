import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { getChurchPlanLimits } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const access = await requireChurchAccess(supabase, churchId)
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error ?? 'Unauthorized' },
        { status: access.authorized ? 500 : 403 }
      )
    }

    const limits = await getChurchPlanLimits(churchId)
    return NextResponse.json({ success: true, billing: limits })
  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json({ error: 'Failed to load billing status' }, { status: 500 })
  }
}
