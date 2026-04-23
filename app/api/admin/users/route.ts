import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'
import { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type UserChurchRole = Database['public']['Tables']['user_church_roles']['Row'] & {
  roles?: Database['public']['Tables']['roles']['Row']
  church?: Database['public']['Tables']['churches']['Row']
  role?: Database['public']['Tables']['roles']['Row']
}


export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (has access to user management)
    const { data: userRoles } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    // Fetch roles separately to avoid join issues
    const { data: roles } = await safeSelect(supabase, 'roles')
    const rolesMap = new Map((roles || []).map(role => [role.id, role]))

    const userRolesWithRoles = (userRoles || [])
      .filter(ur => ur.is_active)
      .map(ur => ({
        ...ur,
        roles: ur.role_id ? rolesMap.get(ur.role_id) : undefined
      }))

    const hasUserManagementAccess = userRolesWithRoles?.some((ur: UserChurchRole) =>
      ur.roles?.name === 'super_admin' ||
      (ur.roles?.permissions as Record<string, unknown>)?.users === true
    )
    
    if (!hasUserManagementAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all users and related data separately to avoid join issues
    const { data: users, error } = await safeSelect(supabase, 'users', {
      order: { column: 'created_at', ascending: false }
    })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get all user church roles
    const { data: allUserChurchRoles } = await safeSelect(supabase, 'user_church_roles')

    // Get all churches
    const { data: churches } = await safeSelect(supabase, 'churches')
    const churchesMap = new Map((churches || []).map(church => [church.id, church]))

    // Create lookup maps
    const userChurchRolesMap = new Map<string, UserChurchRole[]>()
    ;(allUserChurchRoles || []).forEach(ucr => {
      if (!userChurchRolesMap.has(ucr.user_id || '')) {
        userChurchRolesMap.set(ucr.user_id || '', [])
      }
      userChurchRolesMap.get(ucr.user_id || '')?.push({
        ...ucr,
        church: ucr.church_id ? churchesMap.get(ucr.church_id) : undefined,
        role: ucr.role_id ? rolesMap.get(ucr.role_id) : undefined
      })
    })

    // Transform the data to group church roles per user
    const transformedUsers = (users || []).map(user => ({
      ...user,
      church_roles: userChurchRolesMap.get(user.id) || []
    }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Unexpected error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}