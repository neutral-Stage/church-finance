import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

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
    const { data: church, error } = await supabase
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
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: user.id,
        p_church_id: churchId,
        p_resource: 'churches',
        p_action: 'update'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, description, address, phone, email, website, established_date, is_active, settings } = body

    // Update church
    const { data: church, error } = await supabase
      .from('churches')
      .update({
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
      })
      .eq('id', churchId)
      .select()
      .single()

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

    // Check if user is super admin (only super admins can delete churches)
    const { data: userRoles } = await supabase
      .from('user_church_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isSuperAdmin = userRoles?.some(ur => ur.roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super administrators can delete churches' }, { status: 403 })
    }

    // Soft delete - just deactivate
    const { error } = await supabase
      .from('churches')
      .update({ is_active: false })
      .eq('id', churchId)

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