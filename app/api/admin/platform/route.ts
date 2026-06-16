import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireSuperAdminAccess } from '@/lib/permission-helpers'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'inactive'

function computeHealth(params: {
  isActive: boolean
  transactionsLast30: number
  billsPending: number
  advancesOutstanding: number
  netPosition: number
}): HealthStatus {
  if (!params.isActive) return 'inactive'

  const hasPendingIssues = params.billsPending > 0 || params.advancesOutstanding > 0
  const hasActivity = params.transactionsLast30 > 0

  if (params.netPosition > 0 && hasActivity && !hasPendingIssues) return 'excellent'
  if (params.netPosition > 0 && hasActivity) return 'good'
  if (params.netPosition >= 0) return 'fair'
  return 'poor'
}

function resolvePlanStatus(
  subscriptionStatus: string | null,
  planName: string | null
): string {
  if (!planName) return 'none'
  if (subscriptionStatus === 'active') return 'active'
  if (subscriptionStatus === 'trialing') return 'trial'
  if (subscriptionStatus === 'past_due') return 'past_due'
  if (subscriptionStatus === 'canceled') return 'canceled'
  return subscriptionStatus ?? 'free'
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const authCheck = await requireSuperAdminAccess(supabase as never)
    if (!authCheck.authorized) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      { data: churches, error: churchesError },
      { data: funds },
      { data: transactions },
      { data: userRoles },
      { data: plans },
    ] = await Promise.all([
      supabase.from('churches').select('*').order('name', { ascending: true }),
      supabase.from('funds').select('id, church_id, current_balance, is_active'),
      supabase.from('transactions').select('fund_id, created_at, transaction_date'),
      supabase.from('user_church_roles').select('church_id, is_active').eq('is_active', true),
      supabase.from('plans').select('id, name'),
    ])

    if (churchesError) {
      console.error('Platform GET churches error:', churchesError)
      return NextResponse.json({ error: 'Failed to fetch churches' }, { status: 500 })
    }

    const plansMap = new Map((plans ?? []).map(p => [p.id, p.name]))
    const fundsByChurch = new Map<string, typeof funds>()
    for (const fund of funds ?? []) {
      if (!fund.church_id) continue
      const list = fundsByChurch.get(fund.church_id) ?? []
      list.push(fund)
      fundsByChurch.set(fund.church_id, list)
    }

    const fundIdToChurch = new Map<string, string>()
    for (const fund of funds ?? []) {
      if (fund.church_id) fundIdToChurch.set(fund.id, fund.church_id)
    }

    const lastActivityByChurch = new Map<string, string>()
    const txCountByChurch = new Map<string, number>()

    for (const tx of transactions ?? []) {
      const churchId = tx.fund_id ? fundIdToChurch.get(tx.fund_id) : undefined
      if (!churchId) continue

      const txDate = tx.transaction_date ?? tx.created_at
      if (!txDate) continue

      const existing = lastActivityByChurch.get(churchId)
      if (!existing || new Date(txDate) > new Date(existing)) {
        lastActivityByChurch.set(churchId, txDate)
      }

      if (new Date(txDate) >= thirtyDaysAgo) {
        txCountByChurch.set(churchId, (txCountByChurch.get(churchId) ?? 0) + 1)
      }
    }

    const memberCountByChurch = new Map<string, number>()
    for (const role of userRoles ?? []) {
      if (!role.church_id) continue
      memberCountByChurch.set(role.church_id, (memberCountByChurch.get(role.church_id) ?? 0) + 1)
    }

    const churchesWithMetrics = (churches ?? []).map(church => {
      const churchFunds = fundsByChurch.get(church.id) ?? []
      const totalBalance = churchFunds.reduce((sum, f) => sum + (f.current_balance ?? 0), 0)
      const transactionsLast30 = txCountByChurch.get(church.id) ?? 0
      const planName = church.plan_id ? plansMap.get(church.plan_id) ?? null : null

      return {
        id: church.id,
        name: church.name,
        type: church.type,
        is_active: church.is_active ?? false,
        created_at: church.created_at,
        plan_id: church.plan_id,
        plan_name: planName,
        plan_status: resolvePlanStatus(church.subscription_status, planName),
        subscription_status: church.subscription_status,
        health: computeHealth({
          isActive: church.is_active ?? false,
          transactionsLast30,
          billsPending: 0,
          advancesOutstanding: 0,
          netPosition: totalBalance,
        }),
        last_activity_at: lastActivityByChurch.get(church.id) ?? church.updated_at ?? church.created_at,
        member_count: memberCountByChurch.get(church.id) ?? 0,
        total_balance: totalBalance,
        transactions_last_30_days: transactionsLast30,
      }
    })

    const systemStats = {
      total_churches: churchesWithMetrics.length,
      active_churches: churchesWithMetrics.filter(c => c.is_active).length,
      suspended_churches: churchesWithMetrics.filter(c => !c.is_active).length,
      healthy_churches: churchesWithMetrics.filter(c =>
        c.health === 'excellent' || c.health === 'good'
      ).length,
      at_risk_churches: churchesWithMetrics.filter(c =>
        c.health === 'poor' || c.health === 'fair'
      ).length,
    }

    return NextResponse.json({ success: true, churches: churchesWithMetrics, systemStats })
  } catch (error) {
    console.error('Platform API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const authCheck = await requireSuperAdminAccess(supabase as never)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const body = await request.json()
    const { church_id, action } = body as { church_id?: string; action?: 'suspend' | 'reactivate' }

    if (!church_id || !action) {
      return NextResponse.json({ error: 'church_id and action are required' }, { status: 400 })
    }

    if (action !== 'suspend' && action !== 'reactivate') {
      return NextResponse.json({ error: 'action must be suspend or reactivate' }, { status: 400 })
    }

    const isActive = action === 'reactivate'

    const { data: church, error: updateError } = await supabase
      .from('churches')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', church_id)
      .select('id, name, is_active')
      .single()

    if (updateError || !church) {
      console.error('Platform PATCH error:', updateError)
      return NextResponse.json({ error: 'Failed to update church status' }, { status: 500 })
    }

    await logAuditEvent(supabase as never, {
      churchId: church_id,
      userId: authCheck.userId,
      action: 'update',
      entityType: 'church',
      entityId: church_id,
      newData: { is_active: isActive, action },
    })

    return NextResponse.json({
      success: true,
      church,
      message: isActive ? 'Church reactivated' : 'Church suspended',
    })
  } catch (error) {
    console.error('Platform API PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
