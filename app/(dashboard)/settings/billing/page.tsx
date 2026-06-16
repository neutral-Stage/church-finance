'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChurch } from '@/contexts/ChurchContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  CreditCard,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  Users,
  ArrowLeftRight,
  Church,
  UserPlus,
} from 'lucide-react'
import {
  PLAN_LIST,
  formatPlanPrice,
  type PlanId,
} from '@/lib/plans'
import type { ChurchPlanLimits } from '@/lib/billing'
import { cn } from '@/lib/utils'

const USAGE_LABELS = {
  users: { label: 'Team users', icon: Users },
  transactions: { label: 'Transactions (this year)', icon: ArrowLeftRight },
  members: { label: 'Members', icon: UserPlus },
  churches: { label: 'Churches', icon: Church },
} as const

export default function BillingSettingsPage() {
  const { selectedChurch } = useChurch()
  const searchParams = useSearchParams()
  const [billing, setBilling] = useState<ChurchPlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const loadBilling = useCallback(async () => {
    if (!selectedChurch?.id) {
      setBilling(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/billing/status?church_id=${encodeURIComponent(selectedChurch.id)}`
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load billing')
      }
      setBilling(data.billing)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load billing information'
      )
    } finally {
      setLoading(false)
    }
  }, [selectedChurch?.id])

  useEffect(() => {
    void loadBilling()
  }, [loadBilling])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') {
      toast.success('Subscription updated successfully')
    } else if (checkout === 'cancelled') {
      toast.message('Checkout cancelled')
    }
  }, [searchParams])

  const startCheckout = async (planId: PlanId) => {
    if (!selectedChurch?.id || planId === 'free') return

    setCheckoutPlan(planId)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: selectedChurch.id, plan_id: planId }),
      })
      const data = await response.json()

      if (data.demo) {
        toast.message(data.message ?? 'Stripe is not configured (demo mode)')
        return
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? data.message ?? 'Checkout failed')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setCheckoutPlan(null)
    }
  }

  const openPortal = async () => {
    if (!selectedChurch?.id) return

    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: selectedChurch.id }),
      })
      const data = await response.json()

      if (data.demo) {
        toast.message(data.message ?? 'Stripe is not configured (demo mode)')
        return
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? data.message ?? 'Portal unavailable')
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  if (!selectedChurch) {
    return (
      <div className="container mx-auto p-6">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Select a church</GlassCardTitle>
            <GlassCardDescription>
              Choose a church from the header to view billing and plan limits.
            </GlassCardDescription>
          </GlassCardHeader>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Billing & Plans</h1>
              <p className="text-muted-foreground">
                Manage subscription and usage for {selectedChurch.name}
              </p>
            </div>
          </div>
          {billing?.stripeConfigured && billing.stripeCustomerId && (
            <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage subscription
            </Button>
          )}
        </div>

        {!billing?.stripeConfigured && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            Stripe is not configured. Billing runs in demo mode — plan limits still apply locally.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading billing…
          </div>
        ) : billing ? (
          <>
            <GlassCard>
              <GlassCardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <GlassCardTitle className="flex items-center gap-2">
                      Current plan: {billing.planName}
                      {billing.planId === 'pro' && (
                        <Badge variant="secondary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Pro
                        </Badge>
                      )}
                    </GlassCardTitle>
                    <GlassCardDescription>
                      {formatPlanPrice(billing.priceMonthlyCents)} per month
                      {billing.subscriptionStatus && (
                        <> · Status: {billing.subscriptionStatus}</>
                      )}
                    </GlassCardDescription>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(USAGE_LABELS) as Array<keyof typeof USAGE_LABELS>).map(
                    (key) => {
                      const { label, icon: Icon } = USAGE_LABELS[key]
                      const { usage, limit } = billing.usage[key]
                      const percent = limit > 0 ? Math.min(100, (usage / limit) * 100) : 0
                      const nearLimit = percent >= 80

                      return (
                        <div key={key} className="space-y-2 rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {label}
                            </span>
                            <span
                              className={cn(
                                'tabular-nums',
                                nearLimit && 'text-amber-600 dark:text-amber-400'
                              )}
                            >
                              {usage.toLocaleString()} / {limit.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      )
                    }
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {billing.features.auditExport && (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-income" /> Audit export
                    </span>
                  )}
                  {billing.features.scheduledReports && (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-income" /> Scheduled reports
                    </span>
                  )}
                  {billing.features.prioritySupport && (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-income" /> Priority support
                    </span>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_LIST.map((plan) => {
                const isCurrent = billing.planId === plan.id
                const isUpgrade =
                  (billing.planId === 'free' && plan.id !== 'free') ||
                  (billing.planId === 'starter' && plan.id === 'pro')

                return (
                  <GlassCard
                    key={plan.id}
                    className={cn(
                      plan.popular && 'ring-2 ring-primary/40',
                      isCurrent && 'border-primary'
                    )}
                  >
                    <GlassCardHeader>
                      <div className="flex items-center justify-between">
                        <GlassCardTitle>{plan.name}</GlassCardTitle>
                        {plan.popular && <Badge>Popular</Badge>}
                        {isCurrent && <Badge variant="outline">Current</Badge>}
                      </div>
                      <GlassCardDescription>{plan.description}</GlassCardDescription>
                      <p className="text-2xl font-bold pt-2">
                        {formatPlanPrice(plan.priceMonthlyCents)}
                        {plan.priceMonthlyCents > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        )}
                      </p>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-3">
                      <ul className="text-sm space-y-1.5 text-muted-foreground">
                        <li>{plan.maxUsers} team users</li>
                        <li>{plan.maxTransactionsPerYear.toLocaleString()} transactions/year</li>
                        <li>{plan.maxMembers.toLocaleString()} members</li>
                        {plan.features.auditExport && <li>Audit trail export</li>}
                        {plan.features.scheduledReports && <li>Scheduled reports</li>}
                      </ul>
                      {isCurrent ? (
                        <Button className="w-full" variant="secondary" disabled>
                          Current plan
                        </Button>
                      ) : plan.id === 'free' ? (
                        <Button className="w-full" variant="outline" disabled>
                          Downgrade via portal
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full"
                          onClick={() => startCheckout(plan.id)}
                          disabled={checkoutPlan !== null}
                        >
                          {checkoutPlan === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={openPortal}
                          disabled={portalLoading}
                        >
                          Change plan
                        </Button>
                      )}
                    </GlassCardContent>
                  </GlassCard>
                )
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
