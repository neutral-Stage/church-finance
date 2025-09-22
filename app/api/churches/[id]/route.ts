import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect, safeUpdate, safeRpc } from '@/lib/supabase-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const churchId = params.id

    // Get church details with user's role
    // Note: Complex joins with filters need direct query for now
    const { data: churchResult, error } = await supabase
      .from('churches')
      .select(`
        *,
        user_church_roles!inner (
          role_id,
          granted_at,
          expires_at,
          roles (
            name,
            display_name,
            permissions
          )
        )
      `)
      .eq('id', churchId)
      .eq('user_church_roles.user_id', user.id)
      .eq('user_church_roles.is_active', true)
      .eq('is_active', true)
      .single()

    const church = churchResult

    if (error) {
      console.error('Error fetching church:', error)
      return NextResponse.json({ error: 'Church not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ church })
  } catch (error) {
    console.error('Unexpected error in church details API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const churchId = params.id

    // Check user permissions
    const { data: hasPermission, error: permissionError } = await safeRpc(supabase, 'check_user_permission', {
      p_user_id: user.id,
      p_church_id: churchId,
      p_resource: 'churches',
      p_action: 'update'
    })

    if (permissionError) {
      console.error('Error checking permissions:', permissionError)
      return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, description, address, phone, email, website, established_date, is_active, settings } = body

    // Update church
    const { data: churches, error } = await safeUpdate(supabase, 'churches', {
      name,
      type,
      description,
      address,
      phone,
      email,
      website,
      established_date,
      is_active,
      settings
    }, { column: 'id', value: churchId })

    const church = churches?.[0]

    if (error) {
      console.error('Error updating church:', error)
      return NextResponse.json({ error: 'Failed to update church' }, { status: 500 })
    }

    return NextResponse.json({ church })
  } catch (error) {
    console.error('Unexpected error updating church:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const churchId = params.id

    // Check if this is the main church (oldest/first church in the system - cannot be deleted)
    const { data: oldestChurch, error: oldestError } = await supabase
      .from('churches')
      .select('id, created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldestError) {
      console.error('Error fetching oldest church:', oldestError)
      return NextResponse.json({ error: 'Failed to verify church status' }, { status: 500 })
    }

    // Check if this is the main church (first created church)
    if (oldestChurch && (oldestChurch as any).id === churchId) {
      return NextResponse.json({
        error: 'Cannot delete the main church. This is the primary church in the system and contains essential data.'
      }, { status: 403 })
    }

    // Check if user is super admin (only super admins can delete churches)
    const { data: userRoles, error: userRolesError } = await safeSelect(supabase, 'user_church_roles', {
      columns: 'roles (name)',
      filter: { column: 'user_id', value: user.id }
    })

    if (userRolesError) {
      console.error('Error fetching user roles:', userRolesError)
      return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
    }

    const activeUserRoles = userRoles?.filter(ur => (ur as any).is_active === true) || []
    const isSuperAdmin = activeUserRoles.some(ur => (ur as any).roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super administrators can delete churches' }, { status: 403 })
    }

    // Soft delete - just deactivate
    const { error } = await safeUpdate(supabase, 'churches', { is_active: false }, { column: 'id', value: churchId })

    if (error) {
      console.error('Error deleting church:', error)
      return NextResponse.json({ error: 'Failed to delete church' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Church deleted successfully' })
  } catch (error) {
    console.error('Unexpected error deleting church:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}