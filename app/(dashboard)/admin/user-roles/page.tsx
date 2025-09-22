'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserCog, Search, Plus, Trash2, Calendar, User, Building2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useChurch } from '@/contexts/ChurchContext'

interface UserRoleWithDetails {
  id: string
  user_id: string
  church_id: string
  role_id: string
  is_active: boolean
  granted_at: string
  expires_at?: string
  notes?: string
  granted_by?: string
  users: {
    id: string
    email: string
    full_name?: string
  }
  churches: {
    id: string
    name: string
    type: string
  }
  roles: {
    id: string
    name: string
    display_name: string
  }
  granted_by_user?: {
    full_name?: string
    email: string
  }
}

export default function UserRolesPage() {
  const { selectedChurch, isLoading: churchLoading } = useChurch()
  const [userRoles, setUserRoles] = useState<UserRoleWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUserRoles = useCallback(async () => {
    if (!selectedChurch) {
      console.log('UserRolesPage: No church selected, clearing user roles')
      setUserRoles([])
      return
    }

    console.log('UserRolesPage: Fetching user roles for church:', selectedChurch.id, selectedChurch.name)
    setLoading(true)
    setError('')

    try {
      const url = `/api/user-church-roles?church_id=${selectedChurch.id}&include_details=true`
      console.log('UserRolesPage: Making request to:', url)

      const response = await fetch(url)
      const data = await response.json()

      console.log('UserRolesPage: API response:', { status: response.status, data })

      if (response.ok) {
        const roles = data.userChurchRoles || []
        console.log('UserRolesPage: Setting user roles:', roles.length, 'roles')
        setUserRoles(roles)
      } else {
        const errorMsg = data.error || 'Failed to fetch user roles'
        console.error('UserRolesPage: API error:', errorMsg)
        setError(errorMsg)
      }
    } catch (error) {
      console.error('UserRolesPage: Fetch error:', error)
      setError('Failed to fetch user roles')
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  useEffect(() => {
    console.log('UserRolesPage: Selected church changed, triggering fetch')
    fetchUserRoles()
  }, [fetchUserRoles])

  const handleToggleRole = async (roleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/user-church-roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: roleId,
          is_active: !currentStatus
        }),
      })

      if (response.ok) {
        setUserRoles(userRoles.map(role => 
          role.id === roleId ? { ...role, is_active: !currentStatus } : role
        ))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update role status')
      }
    } catch (error) {
      console.error('Error updating role status:', error)
      setError('Failed to update role status')
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'church_admin': return 'bg-orange-100 text-orange-800'
      case 'treasurer': return 'bg-blue-100 text-blue-800'
      case 'finance_viewer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getChurchTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-100 text-blue-800'
      case 'fellowship': return 'bg-green-100 text-green-800'
      case 'ministry': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredUserRoles = userRoles.filter(role =>
    role.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.roles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.churches?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show loading only while church context is actually loading
  if (churchLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">User Role Management</h1>
            <p className="text-white/70 mt-2">View and manage user role assignments across churches</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-white/70">Loading churches...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Role Management</h1>
          <p className="text-white/70 mt-2">View and manage user role assignments across churches</p>
        </div>
        
        <GlassButton
          onClick={() => window.location.href = '/admin/users'}
          variant="success"
        >
          <Plus className="w-4 h-4 mr-2" />
          Grant New Role
        </GlassButton>
      </div>

      {/* Church Selection Info */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle>Current Church</GlassCardTitle>
          <GlassCardDescription>User role assignments for the selected church (use header selector to change)</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {selectedChurch ? (
            <div className="flex items-center space-x-3 px-3 py-2 bg-slate-800 rounded-md">
              <Building2 className="w-5 h-5 text-blue-400" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{selectedChurch.name}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="bg-blue-100 text-blue-800">{selectedChurch.type}</Badge>
                  <Badge className="bg-green-100 text-green-800">{selectedChurch.role?.display_name || 'No Role'}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800 rounded-md">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-white/70 text-sm">No church selected - use the header selector to choose a church</span>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {selectedChurch ? (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="Search by user, role, or church..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:border-white/30"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Roles Table */}
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Active Role Assignments - {selectedChurch.name}
              </GlassCardTitle>
              <GlassCardDescription>
                Manage user role assignments for this church
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                  <span className="ml-3 text-white/70">Loading user roles...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-gray-300">User</TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Church</TableHead>
                      <TableHead className="text-gray-300">Granted By</TableHead>
                      <TableHead className="text-gray-300">Granted Date</TableHead>
                      <TableHead className="text-gray-300">Expires</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserRoles.map((role) => (
                      <TableRow key={role.id} className="border-slate-700">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-white">
                                {role.users?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {role.users?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(role.roles?.name)}>
                            {role.roles?.display_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className={getChurchTypeColor(role.churches?.type)}>
                              {role.churches?.type}
                            </Badge>
                            <span className="text-white text-sm">
                              {role.churches?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {role.granted_by_user?.full_name || role.granted_by_user?.email || 'System'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">
                              {new Date(role.granted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {role.expires_at ? (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">
                                {new Date(role.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.is_active ? "default" : "destructive"}>
                            {role.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleRole(role.id, role.is_active)}
                              className={role.is_active
                                ? "text-red-400 hover:text-red-300"
                                : "text-green-400 hover:text-green-300"
                              }
                            >
                              {role.is_active ? (
                                <Trash2 className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </GlassButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredUserRoles.length === 0 && !loading && (
                <div className="text-center py-8">
                  <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {searchTerm ? 'No matching roles found' : 'No role assignments'}
                  </h3>
                  <p className="text-gray-400">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
                      : 'Grant roles to users to get started'
                    }
                  </p>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </>
      ) : (
        <GlassCard variant="default">
          <GlassCardContent>
            <div className="text-center py-12">
              <UserCog className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Select a Church</h3>
              <p className="text-gray-400 mb-4">
                Please select a church from the selector above to view and manage user role assignments.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}