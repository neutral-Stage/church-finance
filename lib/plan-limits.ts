import { createAdminClient } from '@/lib/supabase-server'
import { isDemoMode } from '@/lib/demo/config'
import {
  getPlanDefinition,
  getResourceLimit,
  type PlanResource,
} from '@/lib/plans'

export interface PlanLimitCheckResult {
  allowed: boolean
  resource: PlanResource
  usage: number
  limit: number
  planId: string
  message?: string
}

export async function getResourceUsage(
  churchId: string,
  resource: PlanResource
): Promise<number> {
  if (isDemoMode()) {
    return 0
  }

  const admin = createAdminClient()
  const yearStart = `${new Date().getFullYear()}-01-01`

  switch (resource) {
    case 'users': {
      const { count, error } = await admin
        .from('user_church_roles')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', churchId)
        .eq('is_active', true)

      if (error) throw new Error(`Failed to count church users: ${error.message}`)
      return count ?? 0
    }
    case 'members': {
      const { count, error } = await admin
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', churchId)

      if (error) throw new Error(`Failed to count members: ${error.message}`)
      return count ?? 0
    }
    case 'transactions': {
      const { count, error } = await admin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', churchId)
        .gte('transaction_date', yearStart)

      if (error) throw new Error(`Failed to count transactions: ${error.message}`)
      return count ?? 0
    }
    case 'churches': {
      const { data: church, error: churchError } = await admin
        .from('churches')
        .select('organization_id')
        .eq('id', churchId)
        .single()

      if (churchError || !church?.organization_id) {
        return 1
      }

      const { count, error } = await admin
        .from('churches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', church.organization_id)
        .eq('is_active', true)

      if (error) throw new Error(`Failed to count churches: ${error.message}`)
      return count ?? 0
    }
    default:
      return 0
  }
}

/**
 * Returns whether a church may create another resource of the given type.
 * In demo mode or when limits cannot be loaded, creation is allowed.
 */
export async function checkPlanLimit(
  churchId: string,
  resource: PlanResource
): Promise<PlanLimitCheckResult> {
  if (isDemoMode()) {
    const plan = getPlanDefinition('free')
    return {
      allowed: true,
      resource,
      usage: 0,
      limit: getResourceLimit(plan, resource),
      planId: plan.id,
    }
  }

  try {
    const admin = createAdminClient()

    const { data: church, error: churchError } = await admin
      .from('churches')
      .select('plan_id')
      .eq('id', churchId)
      .single()

    if (churchError || !church) {
      return {
        allowed: true,
        resource,
        usage: 0,
        limit: Number.POSITIVE_INFINITY,
        planId: 'free',
        message: 'Church not found; skipping plan enforcement',
      }
    }

    const plan = getPlanDefinition(church.plan_id)
    const limit = getResourceLimit(plan, resource)
    const usage = await getResourceUsage(churchId, resource)
    const allowed = usage < limit

    return {
      allowed,
      resource,
      usage,
      limit,
      planId: plan.id,
      message: allowed
        ? undefined
        : `${plan.name} plan allows up to ${limit} ${resource}. Upgrade to add more.`,
    }
  } catch (error) {
    console.error('checkPlanLimit error:', error)
    const plan = getPlanDefinition('free')
    return {
      allowed: true,
      resource,
      usage: 0,
      limit: getResourceLimit(plan, resource),
      planId: plan.id,
      message: 'Plan limits unavailable; allowing operation',
    }
  }
}
