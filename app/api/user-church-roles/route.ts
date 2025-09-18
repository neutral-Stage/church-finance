import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const churchId = url.searchParams.get('church_id')
    const includeDetails = url.searchParams.get('include_details') === 'true'

    if (!churchId) {
      return NextResponse.json({ error: 'Church ID is required' }, { status: 400 })
    }

    // Check if user has access to this church
    const { data: userAccess } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    const hasAccess = userAccess?.some(role =>
      role.church_id === churchId && role.is_active
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get user church roles for this church
    const { data: userChurchRoles } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'church_id', value: churchId },
      order: { column: 'created_at', ascending: false }
    })

    if (!userChurchRoles) {
      return NextResponse.json({ userChurchRoles: [] })
    }

    // Get related data separately to avoid join issues
    const { data: users } = await safeSelect(supabase, 'users')
    const { data: churches } = await safeSelect(supabase, 'churches')
    const { data: roles } = await safeSelect(supabase, 'roles')

    // Create lookup maps
    const usersMap = new Map((users || []).map(user => [user.id, user]))
    const churchesMap = new Map((churches || []).map(church => [church.id, church]))
    const rolesMap = new Map((roles || []).map(role => [role.id, role]))

    // Build enriched data
    const enrichedUserChurchRoles = userChurchRoles.map(ucr => ({
      ...ucr,
      users: ucr.user_id ? usersMap.get(ucr.user_id) : null,
      churches: includeDetails && ucr.church_id ? churchesMap.get(ucr.church_id) : null,
      roles: ucr.role_id ? rolesMap.get(ucr.role_id) : null,
      granted_by_user: ucr.granted_by ? usersMap.get(ucr.granted_by) : null
    }))

    return NextResponse.json({ userChurchRoles: enrichedUserChurchRoles })
  } catch (error) {
    console.error('Unexpected error in user church roles API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, church_id, role_id, expires_at, notes } = body

    if (!user_id || !church_id || !role_id) {
      return NextResponse.json({ error: 'User ID, Church ID, and Role ID are required' }, { status: 400 })
    }

    // Check if current user has admin access to this church
    const { data: hasAdminAccess } = await supabase
      .rpc('check_user_permission', {
        p_user_id: user.id,
        p_church_id: church_id,
        p_resource: 'users',
        p_action: 'create'
      })

    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Grant role to user
    const { data: userChurchRole, error } = await supabase
      .from('user_church_roles')
      .insert({
        user_id,
        church_id,
        role_id,
        granted_by: user.id,
        expires_at,
        notes
      })
      .select(`
        *,
        users (
          id,
          email,
          full_name
        ),
        roles (
          name,
          display_name,
          permissions
        )
      `)
      .single()

    if (error) {
      console.error('Error granting role:', error)
      return NextResponse.json({ error: 'Failed to grant role' }, { status: 500 })
    }

    return NextResponse.json({ userChurchRole }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error granting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, is_active, expires_at, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'User church role ID is required' }, { status: 400 })
    }

    // Get the user church role to check permissions
    const { data: existingRole, error: fetchError } = await supabase
      .from('user_church_roles')
      .select('church_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'User church role not found' }, { status: 404 })
    }

    // Check if current user has admin access to this church
    const { data: hasAdminAccess } = await supabase
      .rpc('check_user_permission', {
        p_user_id: user.id,
        p_church_id: existingRole.church_id,
        p_resource: 'users',
        p_action: 'update'
      })

    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update the user church role
    const { data: userChurchRole, error } = await supabase
      .from('user_church_roles')
      .update({
        is_active,
        expires_at,
        notes
      })
      .eq('id', id)
      .select(`
        *,
        users (
          id,
          email,
          full_name
        ),
        roles (
          name,
          display_name,
          permissions
        )
      `)
      .single()

    if (error) {
      console.error('Error updating user church role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ userChurchRole })
  } catch (error) {
    console.error('Unexpected error updating user church role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}