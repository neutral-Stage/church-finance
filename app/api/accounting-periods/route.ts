import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { checkPeriodOpen, closePeriod } from '@/lib/accounting-periods'
import { auditFinancialMutation } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')
    const date = searchParams.get('date')

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const authCheck = await requireChurchAccess(supabase as never, churchId)
    if (!authCheck.authorized) {
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    if (date) {
      const check = await checkPeriodOpen(supabase as never, churchId, date)
      return NextResponse.json({ success: true, ...check })
    }

    const year = searchParams.get('year')
    let query = supabase
      .from('accounting_periods')
      .select('*')
      .eq('church_id', churchId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (year) {
      query = query.eq('year', parseInt(year, 10))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch accounting periods' }, { status: 500 })
    }

    return NextResponse.json({ success: true, periods: data ?? [] })
  } catch (error) {
    console.error('Accounting periods GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { church_id, year, month } = body

    if (!church_id || year === undefined || month === undefined) {
      return NextResponse.json(
        { error: 'church_id, year, and month are required' },
        { status: 400 }
      )
    }

    const authCheck = await requireChurchAccess(supabase as never, church_id)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const result = await closePeriod(
      adminSupabase as never,
      church_id,
      Number(year),
      Number(month),
      authCheck.userId
    )

    if (!result.success || !result.period) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to close period' },
        { status: 400 }
      )
    }

    await auditFinancialMutation(adminSupabase as never, {
      churchId: church_id,
      userId: authCheck.userId,
      action: 'update',
      entityType: 'accounting_period',
      entityId: result.period.id,
      newData: result.period as unknown as Record<string, unknown>,
      transactionDate: `${year}-${String(month).padStart(2, '0')}-01`,
    })

    return NextResponse.json({ success: true, period: result.period })
  } catch (error) {
    console.error('Accounting periods POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
