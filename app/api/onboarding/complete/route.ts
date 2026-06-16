import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect, safeUpdate } from '@/lib/supabase-helpers'

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

    const body = await request.json().catch(() => ({}))
    const churchId = typeof body.churchId === 'string' ? body.churchId : undefined

    const { data: userChurchRoles, error: rolesError } = await safeSelect(
      supabase,
      'user_church_roles',
      { filter: { column: 'user_id', value: user.id } }
    )

    if (rolesError) {
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    const activeChurchIds = (userChurchRoles ?? [])
      .filter((role) => role.is_active && role.church_id)
      .map((role) => role.church_id as string)

    if (activeChurchIds.length === 0) {
      return NextResponse.json({ error: 'No church found for user' }, { status: 404 })
    }

    const targetChurchId = churchId && activeChurchIds.includes(churchId)
      ? churchId
      : activeChurchIds[0]

    const completedAt = new Date().toISOString()
    const { data: updatedChurches, error: updateError } = await safeUpdate(
      supabase,
      'churches',
      { onboarding_completed_at: completedAt },
      { column: 'id', value: targetChurchId }
    )

    if (updateError || !updatedChurches?.[0]) {
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }

    return NextResponse.json({
      church: updatedChurches[0],
      onboarding_completed_at: completedAt,
    })
  } catch (error) {
    console.error('Onboarding complete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
