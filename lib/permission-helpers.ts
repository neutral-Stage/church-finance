import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Permission helper functions for consistent role and permission checking
 * across the application
 */

export interface UserPermissions {
  isAuthenticated: boolean
  isSuperAdmin: boolean
  churchRoles: Array<{
    church_id: string
    role_name: string
    permissions: Record<string, any>
    is_active: boolean
  }>
  hasGlobalAdminAccess: boolean
  hasChurchAccess: (churchId: string) => boolean
  hasPermission: (permission: string, churchId?: string) => boolean
}

/**
 * Get comprehensive user permissions for the current user
 */
export async function getUserPermissions(
  supabase: SupabaseClient<Database>,
  userId?: string
): Promise<UserPermissions> {
  const defaultPermissions: UserPermissions = {
    isAuthenticated: false,
    isSuperAdmin: false,
    churchRoles: [],
    hasGlobalAdminAccess: false,
    hasChurchAccess: () => false,
    hasPermission: () => false
  }

  try {
    // Get authenticated user if userId not provided
    let currentUserId = userId
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return defaultPermissions
      }
      currentUserId = user.id
    }

    // Fetch user's church roles with role details
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_church_roles')
      .select(`
        church_id,
        is_active,
        expires_at,
        roles!inner (
          id,
          name,
          permissions,
          is_active
        )
      `)
      .eq('user_id', currentUserId)
      .eq('is_active', true)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return defaultPermissions
    }

    const activeRoles = (userRoles || [])
      .filter(ur => {
        const role = ur.roles as any
        return (
          ur.is_active &&
          role?.is_active !== false &&
          (!ur.expires_at || new Date(ur.expires_at) > new Date())
        )
      })
      .map(ur => {
        const role = ur.roles as any
        return {
          church_id: ur.church_id || '',
          role_name: role.name || '',
          permissions: role.permissions || {},
          is_active: ur.is_active
        }
      })

    // Check if user is super admin
    const isSuperAdmin = activeRoles.some(role => role.role_name === 'super_admin')

    // Check for global admin access
    const hasGlobalAdminAccess = isSuperAdmin || activeRoles.some(role => {
      const perms = role.permissions as any
      return perms?.admin?.global === true || perms?.admin?.churches?.read === true
    })

    console.log('[PermissionHelper] getUserPermissions:', {
      userId: currentUserId,
      totalRoles: userRoles?.length,
      activeRolesCount: activeRoles.length,
      activeRolesList: activeRoles.map(r => ({ name: r.role_name, church: r.church_id })),
      isSuperAdmin,
      hasGlobalAdminAccess
    })

    return {
      isAuthenticated: true,
      isSuperAdmin,
      churchRoles: activeRoles as any,
      hasGlobalAdminAccess,
      hasChurchAccess: (churchId: string) => {
        return isSuperAdmin || activeRoles.some(role =>
          role.church_id === churchId || role.church_id === null // null means global access
        )
      },
      hasPermission: (permission: string, churchId?: string) => {
        // Super admin has all permissions
        if (isSuperAdmin) return true

        // Check specific permission
        return activeRoles.some(role => {
          if (churchId && role.church_id && role.church_id !== churchId) {
            return false
          }

          const perms = role.permissions as any
          if (!perms) return false

          // Parse dot notation permission (e.g., "admin.churches.read")
          const parts = permission.split('.')
          let current = perms
          for (const part of parts) {
            if (!current || typeof current !== 'object') return false
            current = current[part]
          }
          return current === true
        })
      }
    }

  } catch (error) {
    console.error('Error in getUserPermissions:', error)
    return defaultPermissions
  }
}

/**
 * Middleware function to check if user has required admin permissions
 */
export async function requireAdminAccess(
  supabase: SupabaseClient<Database>,
  requiredPermission?: string
): Promise<{ authorized: boolean, error?: string, userId?: string }> {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { authorized: false, error: 'Unauthorized - not authenticated' }
    }

    // Get user permissions
    const permissions = await getUserPermissions(supabase, user.id)

    if (!permissions.isAuthenticated) {
      return { authorized: false, error: 'Unauthorized - not authenticated' }
    }

    // Check for required permission
    if (requiredPermission) {
      if (!permissions.hasPermission(requiredPermission)) {
        return {
          authorized: false,
          error: `Insufficient permissions - missing: ${requiredPermission}`
        }
      }
    } else if (!permissions.hasGlobalAdminAccess) {
      return {
        authorized: false,
        error: 'Insufficient permissions - admin access required'
      }
    }

    return { authorized: true, userId: user.id }

  } catch (error) {
    console.error('Error in requireAdminAccess:', error)
    return { authorized: false, error: 'Internal server error' }
  }
}

/**
 * Check if user has access to specific church
 */
export async function requireChurchAccess(
  supabase: SupabaseClient<Database>,
  churchId: string,
  requiredPermission?: string
): Promise<{ authorized: boolean, error?: string, userId?: string }> {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { authorized: false, error: 'Unauthorized' }
    }

    // Get user permissions
    const permissions = await getUserPermissions(supabase, user.id)

    if (!permissions.hasChurchAccess(churchId)) {
      return { authorized: false, error: 'No access to this church' }
    }

    // Check for specific permission if required
    if (requiredPermission && !permissions.hasPermission(requiredPermission, churchId)) {
      return {
        authorized: false,
        error: `Insufficient permissions - missing: ${requiredPermission}`
      }
    }

    return { authorized: true, userId: user.id }

  } catch (error) {
    console.error('Error in requireChurchAccess:', error)
    return { authorized: false, error: 'Internal server error' }
  }
}

/**
 * Legacy support - get user role from old users table
 * This is a fallback for systems still using the old role field
 */
export async function getLegacyUserRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return null
    }

    return user.role || 'viewer'
  } catch (error) {
    console.error('Error fetching legacy user role:', error)
    return null
  }
}

/**
 * Create default admin roles if they don't exist
 * This should be run as part of the migration/setup process
 */
export async function ensureDefaultRoles(supabase: SupabaseClient<Database>) {
  try {
    const defaultRoles = [
      {
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access',
        is_system_role: true,
        permissions: {
          admin: {
            global: true,
            churches: { read: true, create: true, update: true, delete: true },
            users: { read: true, create: true, update: true, delete: true },
            roles: { read: true, create: true, update: true, delete: true }
          },
          funds: { read: true, create: true, update: true, delete: true },
          transactions: { read: true, create: true, update: true, delete: true },
          offerings: { read: true, create: true, update: true, delete: true },
          bills: { read: true, create: true, update: true, delete: true },
          advances: { read: true, create: true, update: true, delete: true }
        }
      },
      {
        name: 'church_admin',
        display_name: 'Church Administrator',
        description: 'Full access to church data',
        is_system_role: true,
        permissions: {
          admin: {
            churches: { read: true, update: true }
          },
          funds: { read: true, create: true, update: true, delete: true },
          transactions: { read: true, create: true, update: true, delete: true },
          offerings: { read: true, create: true, update: true, delete: true },
          bills: { read: true, create: true, update: true, delete: true },
          advances: { read: true, create: true, update: true, delete: true }
        }
      },
      {
        name: 'treasurer',
        display_name: 'Treasurer',
        description: 'Financial management access',
        is_system_role: true,
        permissions: {
          funds: { read: true, update: true },
          transactions: { read: true, create: true, update: true },
          offerings: { read: true, create: true, update: true },
          bills: { read: true, create: true, update: true },
          advances: { read: true, create: true, update: true }
        }
      },
      {
        name: 'member',
        display_name: 'Member',
        description: 'Basic member access',
        is_system_role: true,
        permissions: {
          funds: { read: true },
          transactions: { read: true },
          offerings: { read: true, create: true }
        }
      },
      {
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access',
        is_system_role: true,
        permissions: {
          funds: { read: true },
          transactions: { read: true },
          offerings: { read: true }
        }
      }
    ]

    for (const role of defaultRoles) {
      const { error } = await supabase
        .from('roles')
        .upsert(role, {
          onConflict: 'name',
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`Error creating role ${role.name}:`, error)
      } else {
        console.log(`Role ${role.name} created/updated successfully`)
      }
    }

  } catch (error) {
    console.error('Error in ensureDefaultRoles:', error)
  }
}