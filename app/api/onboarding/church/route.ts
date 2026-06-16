import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createChurchWithDefaults, type CreateChurchInput } from '@/lib/onboarding'
import { safeSelect } from '@/lib/supabase-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CreateChurchInput
    const { name, type, description, address, phone, email, website, organizationName } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Church name is required' }, { status: 400 })
    }

    const { data: existingRoles } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id },
    })

    const activeRoles = existingRoles?.filter((role) => role.is_active && role.church_id) ?? []
    if (activeRoles.length > 0) {
      const { data: churches } = await safeSelect(supabase, 'churches')
      const hasIncomplete = churches?.some(
        (church) =>
          activeRoles.some((role) => role.church_id === church.id) &&
          church.onboarding_completed_at === null
      )

      if (!hasIncomplete) {
        return NextResponse.json(
          { error: 'You already have an active church. Complete onboarding from your dashboard.' },
          { status: 409 }
        )
      }
    }

    const { data, error } = await createChurchWithDefaults(supabase, user.id, {
      name,
      type,
      description,
      address,
      phone,
      email,
      website,
      organizationName,
    })

    if (error || !data) {
      return NextResponse.json({ error: error ?? 'Failed to create church' }, { status: 500 })
    }

    return NextResponse.json(
      {
        church: data.church,
        funds: data.funds,
        organization: data.organization,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Onboarding church API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
