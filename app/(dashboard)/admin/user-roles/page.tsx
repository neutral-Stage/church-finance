'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTable, GlassTableHeader, GlassTableBody, GlassTableRow, GlassTableHead, GlassTableCell } from '@/components/ui/glass-table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserCog, Search, Plus, Trash2, Calendar, User, Building2, Download, TrendingUp, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

  const exportUserRolesReport = () => {
    try {
      const csvContent = generateCSVReport(filteredUserRoles)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-roles-report-${selectedChurch?.name || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Failed to export report')
    }
  }

  const generateCSVReport = (roles: UserRoleWithDetails[]) => {
    const headers = [
      'User Name', 'User Email', 'Role', 'Church', 'Church Type',
      'Status', 'Granted By', 'Granted Date', 'Expires', 'Notes'
    ]

    const rows = roles.map(role => [
      role.users?.full_name || 'Unknown',
      role.users?.email || '',
      role.roles?.display_name || '',
      role.churches?.name || '',
      role.churches?.type || '',
      role.is_active ? 'Active' : 'Inactive',
      role.granted_by_user?.full_name || role.granted_by_user?.email || 'System',
      new Date(role.granted_at).toLocaleDateString(),
      role.expires_at ? new Date(role.expires_at).toLocaleDateString() : 'Never',
      role.notes || ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
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

        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400/30 border-t-purple-400"></div>
              <UserCog className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div className="text-center">
              <span className="text-white font-medium">Loading church context...</span>
              <p className="text-white/60 text-sm mt-1">Initializing user role management</p>
            </div>
          </div>
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
        
        <div className="flex gap-2">
          <GlassButton variant="primary" onClick={exportUserRolesReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
          <GlassButton
            onClick={() => window.location.href = '/admin/users'}
            variant="success"
          >
            <Plus className="w-4 h-4 mr-2" />
            Grant New Role
          </GlassButton>
        </div>
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
                <GlassTable>
                  <GlassTableHeader>
                    <GlassTableRow>
                      <GlassTableHead>User</GlassTableHead>
                      <GlassTableHead>Role</GlassTableHead>
                      <GlassTableHead>Church</GlassTableHead>
                      <GlassTableHead>Granted By</GlassTableHead>
                      <GlassTableHead>Granted Date</GlassTableHead>
                      <GlassTableHead>Expires</GlassTableHead>
                      <GlassTableHead>Status</GlassTableHead>
                      <GlassTableHead>Actions</GlassTableHead>
                    </GlassTableRow>
                  </GlassTableHeader>
                  <GlassTableBody>
                    {filteredUserRoles.map((role) => (
                      <GlassTableRow key={role.id}>
                        <GlassTableCell>
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
                        </GlassTableCell>
                        <GlassTableCell>
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {role.roles?.display_name}
                          </Badge>
                        </GlassTableCell>
                        <GlassTableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              {role.churches?.type}
                            </Badge>
                            <span className="text-white text-sm">
                              {role.churches?.name}
                            </span>
                          </div>
                        </GlassTableCell>
                        <GlassTableCell className="text-gray-300">
                          {role.granted_by_user?.full_name || role.granted_by_user?.email || 'System'}
                        </GlassTableCell>
                        <GlassTableCell className="text-gray-300">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">
                              {new Date(role.granted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </GlassTableCell>
                        <GlassTableCell className="text-gray-300">
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
                        </GlassTableCell>
                        <GlassTableCell>
                          <Badge variant={role.is_active ? "default" : "destructive"}>
                            {role.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </GlassTableCell>
                        <GlassTableCell>
                          <div className="flex gap-1">
                            <GlassButton
                              variant={role.is_active ? "error" : "success"}
                              size="sm"
                              onClick={() => handleToggleRole(role.id, role.is_active)}
                            >
                              {role.is_active ? (
                                <Trash2 className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </GlassButton>
                          </div>
                        </GlassTableCell>
                      </GlassTableRow>
                    ))}
                  </GlassTableBody>
                </GlassTable>
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