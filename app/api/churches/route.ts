import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect, safeInsert } from '@/lib/supabase-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Churches API: Starting request...')
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Churches API: User auth check:', { user: user?.id, authError })

    if (authError || !user) {
      console.log('Churches API: Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Churches API: Fetching user church roles for user:', user.id)

    // Get user's church roles with error handling
    const { data: userChurchRoles, error: rolesError } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    console.log('Churches API: User church roles result:', {
      data: userChurchRoles,
      error: rolesError,
      count: userChurchRoles?.length || 0
    })

    if (rolesError) {
      console.error('Churches API: Error fetching user church roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    if (!userChurchRoles || userChurchRoles.length === 0) {
      console.log('Churches API: No church roles found for user')
      return NextResponse.json({ churches: [] })
    }

    // Filter active roles and get church IDs
    const activeRoles = userChurchRoles.filter(role => role.is_active)
    console.log('Churches API: Active roles:', activeRoles.length)

    // Get roles first so we can check for super_admin
    console.log('Churches API: Fetching roles...')
    const { data: roles, error: rolesDataError } = await safeSelect(supabase, 'roles')

    if (rolesDataError) {
      console.error('Churches API: Error fetching roles:', rolesDataError)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    const rolesMap = new Map((roles || []).map(role => [role.id, role]))
    console.log('Churches API: Roles map created with', rolesMap.size, 'roles')

    // Check if user is super admin
    const isSuperAdmin = activeRoles.some(role => {
      const roleData = role.role_id ? rolesMap.get(role.role_id) : null
      return roleData?.name === 'super_admin'
    })

    const churchIds = [...new Set(activeRoles.map(role => role.church_id).filter(Boolean))]
    console.log('Churches API: Church IDs from roles:', churchIds)

    if (churchIds.length === 0 && !isSuperAdmin) {
      console.log('Churches API: No church IDs found in active roles and not super admin')
      return NextResponse.json({ churches: [] })
    }

    // Get all churches with error handling
    console.log('Churches API: Fetching all churches...')
    const { data: allChurches, error: churchesError } = await safeSelect(supabase, 'churches')

    console.log('Churches API: All churches result:', {
      dataLength: allChurches?.length || 0,
      error: churchesError
    })

    if (churchesError) {
      console.error('Churches API: Error fetching churches:', churchesError)
      return NextResponse.json({ error: 'Failed to fetch churches' }, { status: 500 })
    }

    const userChurches = allChurches?.filter(church =>
      church.is_active && (isSuperAdmin || churchIds.includes(church.id))
    ) || []

    console.log('Churches API: Filtered user churches:', userChurches.length)

    // Find the super_admin role instance if present
    const superAdminRoleInstance = activeRoles.find(role => {
      const roleData = role.role_id ? rolesMap.get(role.role_id) : null
      return roleData?.name === 'super_admin'
    })
    
    const superAdminRoleData = superAdminRoleInstance?.role_id ? rolesMap.get(superAdminRoleInstance.role_id) : null

    // Build church data with role information
    const churchesWithRoles = userChurches.map(church => {
      // First check for a specific role for this church
      let churchRoles = activeRoles.filter(role => role.church_id === church.id)
      let churchRole = churchRoles[0] // Take first active explicit role
      let roleData = churchRole?.role_id ? rolesMap.get(churchRole.role_id) : null

      // If no explicit role but user is super_admin, grant them super_admin access to this church
      if (!churchRole && isSuperAdmin && superAdminRoleInstance) {
        churchRole = superAdminRoleInstance;
        roleData = superAdminRoleData;
      }

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

    console.log('Churches API: Final response with', churchesWithRoles.length, 'churches')
    return NextResponse.json({ churches: churchesWithRoles })
  } catch (error) {
    console.error('Churches API: Unexpected error:', error)
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
    const { data: userRoles, error: userRolesError } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    if (userRolesError) {
      console.error('Error fetching user roles:', userRolesError)
      return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
    }

    // Get roles data to check for super admin
    const { data: roles } = await safeSelect(supabase, 'roles')
    const rolesMap = new Map((roles || []).map(role => [role.id, role]))

    const activeUserRoles = userRoles?.filter(ur => ur.is_active === true) || []
    const isSuperAdmin = activeUserRoles.some(ur => {
      const roleData = ur.role_id ? rolesMap.get(ur.role_id) : null
      return roleData?.name === 'super_admin'
    })
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, description, address, phone, email, website, established_date } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    // Create the church
    const { data: churches, error } = await safeInsert(supabase, 'churches', {
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

    const church = churches?.[0]

    if (error) {
      console.error('Error creating church:', error)
      return NextResponse.json({ error: 'Failed to create church' }, { status: 500 })
    }

    // Grant the creator admin access to the new church
    const { data: adminRoles, error: roleError } = await safeSelect(supabase, 'roles', {
      filter: { column: 'name', value: 'church_admin' }
    })

    const adminRole = adminRoles?.[0]
    if (adminRole && church?.id) {
      await safeInsert(supabase, 'user_church_roles', {
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