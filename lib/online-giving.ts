import { getStripeClient, isStripeConfigured } from '@/lib/billing'

export interface OnlineGivingInput {
  churchId: string
  amount: number
  donorName: string
  donorEmail?: string
  fundType?: string
  notes?: string
}

export interface OnlineGivingResult {
  success: boolean
  demo: boolean
  stripeConfigured: boolean
  clientSecret?: string
  paymentIntentId?: string
  message: string
}

export async function createOnlineGivingPayment(
  input: OnlineGivingInput
): Promise<OnlineGivingResult> {
  const amountCents = Math.round(input.amount * 100)
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  if (amountCents < 100) {
    return {
      success: false,
      demo,
      stripeConfigured: isStripeConfigured(),
      message: 'Minimum donation is ৳1.00',
    }
  }

  if (!isStripeConfigured() || demo) {
    return {
      success: true,
      demo: true,
      stripeConfigured: false,
      message:
        'Donation recorded in demo mode. Configure Stripe keys for live online giving.',
      paymentIntentId: `demo_pi_${Date.now()}`,
    }
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return {
      success: false,
      demo: false,
      stripeConfigured: false,
      message: 'Stripe client unavailable',
    }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'bdt',
      automatic_payment_methods: { enabled: true },
      metadata: {
        church_id: input.churchId,
        donor_name: input.donorName,
        donor_email: input.donorEmail ?? '',
        fund_type: input.fundType ?? 'general',
        notes: input.notes ?? '',
        source: 'online_giving_stub',
      },
      description: `Online giving — ${input.donorName}`,
    })

    return {
      success: true,
      demo: false,
      stripeConfigured: true,
      clientSecret: paymentIntent.client_secret ?? undefined,
      paymentIntentId: paymentIntent.id,
      message: 'Payment intent created. Complete payment with Stripe Elements.',
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create payment intent'
    return {
      success: false,
      demo: false,
      stripeConfigured: true,
      message,
    }
  }
}
