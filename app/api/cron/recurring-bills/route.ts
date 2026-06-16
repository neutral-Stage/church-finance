import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { executeRecurringBills } from '@/lib/recurring-bills'

export const dynamic = 'force-dynamic'

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.RECURRING_BILLS_CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const result = await executeRecurringBills(adminSupabase as never)

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    })
  } catch (error) {
    console.error('Recurring bills cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
