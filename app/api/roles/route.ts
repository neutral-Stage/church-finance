import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active roles
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Unexpected error in roles API:', error)
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

    // Check if user is super admin (only super admins can create roles)
    const { data: userRoles } = await supabase
      .from('user_church_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isSuperAdmin = userRoles?.some(ur => (ur as any).roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only super administrators can create roles' }, { status: 403 })
    }

    const body = await request.json()
    const { name, display_name, description, permissions } = body

    if (!name || !display_name || !permissions) {
      return NextResponse.json({ error: 'Name, display name, and permissions are required' }, { status: 400 })
    }

    // Create the role
    const { data: role, error } = await (supabase
      .from('roles') as any)
      .insert({
        name,
        display_name,
        description,
        permissions,
        is_system_role: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating role:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json({ role }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}