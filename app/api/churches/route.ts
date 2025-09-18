import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'

export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's church roles
    const { data: userChurchRoles } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    if (!userChurchRoles || userChurchRoles.length === 0) {
      return NextResponse.json({ churches: [] })
    }

    // Filter active roles and get church IDs
    const activeRoles = userChurchRoles.filter(role => role.is_active)
    const churchIds = [...new Set(activeRoles.map(role => role.church_id).filter(Boolean))]

    if (churchIds.length === 0) {
      return NextResponse.json({ churches: [] })
    }

    // Get churches
    const { data: allChurches } = await safeSelect(supabase, 'churches')
    const userChurches = allChurches?.filter(church =>
      church.is_active && churchIds.includes(church.id)
    ) || []

    // Get roles for user churches
    const { data: roles } = await safeSelect(supabase, 'roles')
    const rolesMap = new Map((roles || []).map(role => [role.id, role]))

    // Build church data with role information
    const churchesWithRoles = userChurches.map(church => {
      const churchRoles = activeRoles.filter(role => role.church_id === church.id)
      const churchRole = churchRoles[0] // Take first active role
      const roleData = churchRole?.role_id ? rolesMap.get(churchRole.role_id) : null

      return {
        ...church,
        user_church_roles: [
          {
            ...churchRole,
            roles: roleData
          }
        ]
      }
    })

    return NextResponse.json({ churches: churchesWithRoles })
  } catch (error) {
    console.error('Unexpected error in churches API:', error)
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

    // Check if user is super admin
    const { data: userRoles } = await supabase
      .from('user_church_roles')
      .select('roles (name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const isSuperAdmin = userRoles?.some(ur => ur.roles?.name === 'super_admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, description, address, phone, email, website, established_date } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    // Create the church
    const { data: church, error } = await supabase
      .from('churches')
      .insert({
        name,
        type,
        description,
        address,
        phone,
        email,
        website,
        established_date,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating church:', error)
      return NextResponse.json({ error: 'Failed to create church' }, { status: 500 })
    }

    // Grant the creator admin access to the new church
    const { data: adminRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'church_admin')
      .single()

    if (adminRole) {
      await supabase
        .from('user_church_roles')
        .insert({
          user_id: user.id,
          church_id: church.id,
          role_id: adminRole.id,
          granted_by: user.id,
          notes: 'Church creator - automatic admin access'
        })
    }

    return NextResponse.json({ church }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating church:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}