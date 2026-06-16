import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getUserPermissions } from '@/lib/permission-helpers'
import {
  createInvitation,
  listChurchInvitations,
  revokeInvitation,
} from '@/lib/invitations'

export const dynamic = 'force-dynamic'

async function requireInviteManagement(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  churchId: string
): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized' }
  }

  const permissions = await getUserPermissions(supabase as never, user.id)
  if (!permissions.hasChurchAccess(churchId)) {
    return { authorized: false, error: 'No access to this church' }
  }

  const canManage =
    permissions.isSuperAdmin ||
    permissions.churchRoles.some(
      role =>
        role.church_id === churchId &&
        (role.role_name === 'church_admin' ||
          role.role_name === 'super_admin' ||
          permissions.hasPermission('admin.users.create', churchId))
    )

  if (!canManage) {
    return { authorized: false, error: 'Insufficient permissions to manage invitations' }
  }

  return { authorized: true, userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const churchId = new URL(request.url).searchParams.get('church_id')

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const authCheck = await requireInviteManagement(supabase, churchId)
    if (!authCheck.authorized) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const invitations = await listChurchInvitations(supabase as never, churchId)

    const { data: roles } = await supabase.from('roles').select('id, name, display_name')
    const rolesMap = new Map((roles ?? []).map(role => [role.id, role]))

    const enriched = invitations.map(inv => ({
      ...inv,
      role: inv.role_id ? rolesMap.get(inv.role_id) ?? null : null,
    }))

    return NextResponse.json({ success: true, invitations: enriched })
  } catch (error) {
    console.error('Invitations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const { church_id, email, role_id } = body

    if (!church_id || !email || !role_id) {
      return NextResponse.json(
        { error: 'church_id, email, and role_id are required' },
        { status: 400 }
      )
    }

    const authCheck = await requireInviteManagement(supabase, church_id)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const result = await createInvitation(supabase as never, {
      churchId: church_id,
      email,
      roleId: role_id,
      invitedBy: authCheck.userId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to create invitation' }, { status: 400 })
    }

    return NextResponse.json({ success: true, invitation: result.invitation }, { status: 201 })
  } catch (error) {
    console.error('Invitations POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const invitationId = new URL(request.url).searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: invitation, error: fetchError } = await supabase
      .from('church_invitations')
      .select('church_id')
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const authCheck = await requireInviteManagement(supabase, invitation.church_id)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const result = await revokeInvitation(supabase as never, invitationId, authCheck.userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to revoke invitation' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invitations DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
