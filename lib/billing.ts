import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { isDemoMode } from '@/lib/demo/config'
import {
  getPlanDefinition,
  getResourceLimit,
  isPlanId,
  type PlanId,
  type PlanResource,
} from '@/lib/plans'
import { getResourceUsage } from '@/lib/plan-limits'

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
}

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return new Stripe(secretKey, {
    typescript: true,
  })
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

function getStripePriceId(planId: PlanId): string | null {
  if (planId === 'starter') {
    return process.env.STRIPE_STARTER_PRICE_ID ?? null
  }
  if (planId === 'pro') {
    return process.env.STRIPE_PRO_PRICE_ID ?? null
  }
  return null
}

export interface ChurchPlanLimits {
  churchId: string
  planId: PlanId
  planName: string
  priceMonthlyCents: number
  subscriptionStatus: string | null
  stripeCustomerId: string | null
  stripeConfigured: boolean
  usage: Record<PlanResource, { usage: number; limit: number }>
  features: {
    auditExport: boolean
    scheduledReports: boolean
    prioritySupport: boolean
  }
}

export async function getChurchPlanLimits(churchId: string): Promise<ChurchPlanLimits> {
  const plan = getPlanDefinition('free')
  const defaultUsage = {
    users: { usage: 0, limit: plan.maxUsers },
    transactions: { usage: 0, limit: plan.maxTransactionsPerYear },
    churches: { usage: 0, limit: plan.maxChurches },
    members: { usage: 0, limit: plan.maxMembers },
  }

  if (isDemoMode()) {
    return {
      churchId,
      planId: 'free',
      planName: plan.name,
      priceMonthlyCents: plan.priceMonthlyCents,
      subscriptionStatus: null,
      stripeCustomerId: null,
      stripeConfigured: isStripeConfigured(),
      usage: defaultUsage,
      features: plan.features,
    }
  }

  const admin = createAdminClient()
  const { data: church, error } = await admin
    .from('churches')
    .select('plan_id, subscription_status, stripe_customer_id')
    .eq('id', churchId)
    .single()

  if (error || !church) {
    throw new Error('Church not found')
  }

  const activePlan = getPlanDefinition(church.plan_id)
  const resources: PlanResource[] = ['users', 'transactions', 'members', 'churches']

  const usageEntries = await Promise.all(
    resources.map(async (resource) => {
      const usage = await getResourceUsage(churchId, resource)
      return [resource, { usage, limit: getResourceLimit(activePlan, resource) }] as const
    })
  )

  return {
    churchId,
    planId: activePlan.id,
    planName: activePlan.name,
    priceMonthlyCents: activePlan.priceMonthlyCents,
    subscriptionStatus: church.subscription_status,
    stripeCustomerId: church.stripe_customer_id,
    stripeConfigured: isStripeConfigured(),
    usage: Object.fromEntries(usageEntries) as ChurchPlanLimits['usage'],
    features: activePlan.features,
  }
}

export interface CreateCheckoutSessionInput {
  churchId: string
  planId: PlanId
  customerEmail: string
  userId: string
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<{ url: string | null; demo: boolean; message?: string }> {
  if (!isStripeConfigured()) {
    return {
      url: null,
      demo: true,
      message: 'Stripe is not configured. Billing runs in demo mode.',
    }
  }

  if (input.planId === 'free') {
    return {
      url: null,
      demo: false,
      message: 'Free plan does not require checkout.',
    }
  }

  const priceId = getStripePriceId(input.planId)
  if (!priceId) {
    return {
      url: null,
      demo: true,
      message: `Missing Stripe price ID for ${input.planId} plan.`,
    }
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return {
      url: null,
      demo: true,
      message: 'Stripe client unavailable.',
    }
  }

  const admin = createAdminClient()
  const { data: church, error } = await admin
    .from('churches')
    .select('id, name, stripe_customer_id')
    .eq('id', input.churchId)
    .single()

  if (error || !church) {
    throw new Error('Church not found')
  }

  let customerId = church.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.customerEmail,
      name: church.name,
      metadata: {
        church_id: input.churchId,
        user_id: input.userId,
      },
    })
    customerId = customer.id

    await admin
      .from('churches')
      .update({ stripe_customer_id: customerId })
      .eq('id', input.churchId)
  }

  const siteUrl = getSiteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/settings/billing?checkout=success`,
    cancel_url: `${siteUrl}/settings/billing?checkout=cancelled`,
    metadata: {
      church_id: input.churchId,
      plan_id: input.planId,
      user_id: input.userId,
    },
    subscription_data: {
      metadata: {
        church_id: input.churchId,
        plan_id: input.planId,
      },
    },
    allow_promotion_codes: true,
  })

  return { url: session.url, demo: false }
}

export async function createCustomerPortalSession(
  churchId: string
): Promise<{ url: string | null; demo: boolean; message?: string }> {
  if (!isStripeConfigured()) {
    return {
      url: null,
      demo: true,
      message: 'Stripe is not configured. Billing runs in demo mode.',
    }
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return {
      url: null,
      demo: true,
      message: 'Stripe client unavailable.',
    }
  }

  const admin = createAdminClient()
  const { data: church, error } = await admin
    .from('churches')
    .select('stripe_customer_id')
    .eq('id', churchId)
    .single()

  if (error || !church?.stripe_customer_id) {
    return {
      url: null,
      demo: false,
      message: 'No Stripe customer found for this church. Subscribe to a paid plan first.',
    }
  }

  const siteUrl = getSiteUrl()
  const session = await stripe.billingPortal.sessions.create({
    customer: church.stripe_customer_id,
    return_url: `${siteUrl}/settings/billing`,
  })

  return { url: session.url, demo: false }
}

export async function syncChurchSubscriptionFromStripe(
  subscription: Stripe.Subscription
): Promise<void> {
  const churchId = subscription.metadata.church_id
  if (!churchId) return

  const planIdRaw = subscription.metadata.plan_id
  const planId = isPlanId(planIdRaw) ? planIdRaw : inferPlanIdFromSubscription(subscription)
  const isActive =
    subscription.status === 'active' || subscription.status === 'trialing'

  const admin = createAdminClient()
  await admin
    .from('churches')
    .update({
      plan_id: isActive ? planId : 'free',
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', churchId)
}

function inferPlanIdFromSubscription(subscription: Stripe.Subscription): PlanId {
  const starterPrice = process.env.STRIPE_STARTER_PRICE_ID
  const proPrice = process.env.STRIPE_PRO_PRICE_ID
  const priceId = subscription.items.data[0]?.price.id

  if (priceId && proPrice && priceId === proPrice) return 'pro'
  if (priceId && starterPrice && priceId === starterPrice) return 'starter'
  return 'starter'
}
