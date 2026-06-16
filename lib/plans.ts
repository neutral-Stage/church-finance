/**
 * Plan definitions aligned with the `plans` table migration (free, starter, pro).
 */

export type PlanId = 'free' | 'starter' | 'pro'

export type PlanResource = 'users' | 'transactions' | 'churches' | 'members'

export interface PlanFeatures {
  auditExport: boolean
  scheduledReports: boolean
  prioritySupport: boolean
}

export interface PlanDefinition {
  id: PlanId
  name: string
  description: string
  priceMonthlyCents: number
  maxUsers: number
  maxTransactionsPerYear: number
  maxChurches: number
  maxMembers: number
  features: PlanFeatures
  /** Highlight on pricing / billing UI */
  popular?: boolean
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'For small congregations getting started with digital bookkeeping.',
    priceMonthlyCents: 0,
    maxUsers: 3,
    maxTransactionsPerYear: 500,
    maxChurches: 1,
    maxMembers: 250,
    features: {
      auditExport: false,
      scheduledReports: false,
      prioritySupport: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For growing churches that need more team members and volume.',
    priceMonthlyCents: 2900,
    maxUsers: 10,
    maxTransactionsPerYear: 5_000,
    maxChurches: 1,
    maxMembers: 1_000,
    features: {
      auditExport: false,
      scheduledReports: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For multi-campus churches needing exports, reports, and scale.',
    priceMonthlyCents: 7900,
    maxUsers: 50,
    maxTransactionsPerYear: 50_000,
    maxChurches: 5,
    maxMembers: 10_000,
    popular: true,
    features: {
      auditExport: true,
      scheduledReports: true,
      prioritySupport: true,
    },
  },
}

export const PLAN_LIST: PlanDefinition[] = Object.values(PLAN_DEFINITIONS)

export function isPlanId(value: string): value is PlanId {
  return value === 'free' || value === 'starter' || value === 'pro'
}

export function getPlanDefinition(planId: string | null | undefined): PlanDefinition {
  if (planId && isPlanId(planId)) {
    return PLAN_DEFINITIONS[planId]
  }
  return PLAN_DEFINITIONS.free
}

export function formatPlanPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function getResourceLimit(plan: PlanDefinition, resource: PlanResource): number {
  switch (resource) {
    case 'users':
      return plan.maxUsers
    case 'transactions':
      return plan.maxTransactionsPerYear
    case 'churches':
      return plan.maxChurches
    case 'members':
      return plan.maxMembers
    default:
      return 0
  }
}
