import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { createCheckoutSession } from '@/lib/billing'
import { isPlanId } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const churchId = body.church_id as string | undefined
    const planId = body.plan_id as string | undefined

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    if (!planId || !isPlanId(planId)) {
      return NextResponse.json(
        { error: 'plan_id must be one of: starter, pro' },
        { status: 400 }
      )
    }

    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Use the customer portal to manage an existing subscription' },
        { status: 400 }
      )
    }

    const access = await requireChurchAccess(supabase, churchId, 'admin.churches.update')
    if (!access.authorized || !access.userId) {
      return NextResponse.json(
        { error: access.error ?? 'Unauthorized' },
        { status: access.authorized ? 500 : 403 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await createCheckoutSession({
      churchId,
      planId,
      customerEmail: user.email,
      userId: access.userId,
    })

    if (result.demo || !result.url) {
      return NextResponse.json({
        success: false,
        demo: true,
        message: result.message ?? 'Stripe billing is not configured.',
      })
    }

    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    console.error('Billing checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
