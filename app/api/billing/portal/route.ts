import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { createCustomerPortalSession } from '@/lib/billing'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const churchId = body.church_id as string | undefined

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const access = await requireChurchAccess(supabase, churchId, 'admin.churches.update')
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error ?? 'Unauthorized' },
        { status: access.authorized ? 500 : 403 }
      )
    }

    const result = await createCustomerPortalSession(churchId)

    if (result.demo || !result.url) {
      return NextResponse.json({
        success: false,
        demo: true,
        message: result.message ?? 'Stripe billing is not configured.',
      })
    }

    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
