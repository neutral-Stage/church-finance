import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { safeSelect, safeInsert } from '@/lib/supabase-helpers'
import { getUserPermissions } from '@/lib/permission-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Churches API: Starting request...')
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Churches API: User auth check:', { user: user?.id, authError })

    if (authError || !user) {
      console.log('Churches API: Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use the permission helper to check for super_admin status
    // This uses a JOIN query which works better with RLS
    const permissions = await getUserPermissions(supabase as any, user.id)
    const isSuperAdmin = permissions.isSuperAdmin
    console.log('Churches API: Permission check:', { isSuperAdmin, hasGlobalAdminAccess: permissions.hasGlobalAdminAccess })

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

    const activeRoles = (userChurchRoles || []).filter(role => role.is_active)

    // Get all active churches using admin client
    console.log('Churches API: Fetching all churches...')
    const { data: allChurches, error: churchesError } = await safeSelect(adminClient, 'churches')

    console.log('Churches API: All churches result:', {
      dataLength: allChurches?.length || 0,
      error: churchesError
    })

    if (churchesError) {
      console.error('Churches API: Error fetching churches:', churchesError)
      return NextResponse.json({ error: 'Failed to fetch churches' }, { status: 500 })
    }

    // Filter churches based on user's role
    let userChurches
    if (isSuperAdmin) {
      // Super admins can see all active churches
      userChurches = allChurches?.filter(church => church.is_active) || []
      console.log('Churches API: Super admin - showing all churches:', userChurches.length)
    } else {
      // Regular users only see churches where they have a role
      const churchIds = [...new Set(activeRoles.map(role => role.church_id).filter(Boolean))]
      userChurches = allChurches?.filter(church =>
        church.is_active && churchIds.includes(church.id)
      ) || []
      console.log('Churches API: Regular user - filtered to:', userChurches.length)
    }

    console.log('Churches API: Filtered user churches:', userChurches.length)

    // Build church data with role information
    // For super admins, they may not have explicit roles for all churches
    const churchesWithRoles = userChurches.map(church => {
      // Get the role from permissions.churchRoles if available
      const permRole = permissions.churchRoles.find(r => r.church_id === church.id)

      // Find the userChurchRole entry for this church
      const churchRole = activeRoles.find(role => role.church_id === church.id)

      // Build the effective role info
      let effectiveRole = null
      if (permRole) {
        effectiveRole = {
          name: permRole.role_name,
          display_name: permRole.role_name?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()),
          permissions: permRole.permissions
        }
      } else if (isSuperAdmin) {
        // Super admin without explicit role for this church
        effectiveRole = {
          name: 'super_admin',
          display_name: 'Super Admin',
          permissions: {}
        }
      }

      return {
        ...church,
        user_church_roles: [
          {
            ...churchRole,
            roles: effectiveRole
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

    // Use admin client to bypass RLS for church creation
    const adminClient = createAdminClient()
    console.log('[Church Create] Using admin client for insert...')

    // Create the church using raw admin client insert (bypassing helper)
    const insertData = {
      name,
      type,
      description,
      address,
      phone,
      email,
      website,
      established_date,
      created_by: user.id
    }
    console.log('[Church Create] Insert data:', insertData)

    const { data: churches, error } = await adminClient
      .from('churches')
      .insert(insertData)
      .select()

    console.log('[Church Create] Insert result:', { data: churches, error })

    const church = churches?.[0]

    if (error) {
      console.error('Error creating church:', error)
      return NextResponse.json({ error: 'Failed to create church' }, { status: 500 })
    }

    // Grant the creator admin access to the new church
    // First try church_admin, then fall back to super_admin if not found
    let { data: adminRoles, error: roleError } = await safeSelect(adminClient, 'roles', {
      filter: { column: 'name', value: 'church_admin' }
    })

    if (roleError) {
      console.error('Error fetching church_admin role:', roleError)
    }

    // If no church_admin role found, try super_admin
    if (!adminRoles || adminRoles.length === 0) {
      console.log('No church_admin role found, trying super_admin...')
      const superAdminResult = await safeSelect(adminClient, 'roles', {
        filter: { column: 'name', value: 'super_admin' }
      })
      adminRoles = superAdminResult.data
      if (superAdminResult.error) {
        console.error('Error fetching super_admin role:', superAdminResult.error)
      }
    }

    const adminRole = adminRoles?.[0]
    console.log('Admin role for new church:', adminRole)

    if (adminRole && church?.id) {
      const { data: roleAssignment, error: assignError } = await safeInsert(adminClient, 'user_church_roles', {
        user_id: user.id,
        church_id: church.id,
        role_id: adminRole.id,
        granted_by: user.id,
        notes: 'Church creator - automatic admin access'
      })

      if (assignError) {
        console.error('Error assigning role to church creator:', assignError)
      } else {
        console.log('Role assigned successfully:', roleAssignment)
      }
    } else {
      console.error('Could not assign role - missing adminRole or church.id:', { adminRole, churchId: church?.id })
    }

    return NextResponse.json({ church }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating church:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}