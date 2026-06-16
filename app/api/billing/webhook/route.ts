import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient, syncChurchSubscriptionFromStripe } from '@/lib/billing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripe = getStripeClient()

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhooks are not configured' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook payload'
    console.error('Stripe webhook verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await syncChurchSubscriptionFromStripe(subscription)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await syncChurchSubscriptionFromStripe(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await syncChurchSubscriptionFromStripe(subscription)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
