import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type RoleUpdate = Partial<Database['public']['Tables']['roles']['Update']>

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

    const roleId = params.id

    // Get role details
    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching role:', error)
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Unexpected error in role details API:', error)
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

    // Check if user is super admin (only super admins can edit roles)
    const { data: userRoles } = await supabase
      .from('user_church_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isSuperAdmin = userRoles?.some(ur => (ur as any).roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super administrators can edit roles' }, { status: 403 })
    }

    const roleId = params.id
    const body = await request.json()
    const { name, display_name, description, permissions } = body

    if (!display_name) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }

    // Get the existing role to check if it's a system role
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prepare update data based on role type
    const updateData: RoleUpdate = {
      display_name,
      description
    }

    // For custom roles, allow name and permissions updates
    if (!(existingRole as any).is_system_role) {
      updateData.name = name
      updateData.permissions = permissions
    }

    // Update the role
    const { data: role, error } = await (supabase
      .from('roles') as any)
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Unexpected error updating role:', error)
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

    // Check if user is super admin (only super admins can delete roles)
    const { data: userRoles } = await supabase
      .from('user_church_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isSuperAdmin = userRoles?.some(ur => (ur as any).roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super administrators can delete roles' }, { status: 403 })
    }

    const roleId = params.id

    // Check if role is a system role
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single()

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if ((existingRole as any).is_system_role) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })
    }

    // Check if role is in use
    const { data: roleUsage, error: usageError } = await supabase
      .from('user_church_roles')
      .select('id')
      .eq('role_id', roleId)
      .eq('is_active', true)
      .limit(1)

    if (usageError) {
      console.error('Error checking role usage:', usageError)
      return NextResponse.json({ error: 'Failed to check role usage' }, { status: 500 })
    }

    if (roleUsage && roleUsage.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is currently assigned to users. Please remove all user assignments first.' 
      }, { status: 400 })
    }

    // Soft delete - just deactivate the role
    const { error } = await (supabase
      .from('roles') as any)
      .update({ is_active: false })
      .eq('id', roleId)

    if (error) {
      console.error('Error deleting role:', error)
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Unexpected error deleting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}