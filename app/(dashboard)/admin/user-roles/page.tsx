'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
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
      setUserRoles([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = `/api/user-church-roles?church_id=${selectedChurch.id}&include_details=true`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        const roles = data.userChurchRoles || []
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
      case 'super_admin': return 'bg-destructive/15 text-destructive border-destructive/30'
      case 'church_admin': return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
      case 'treasurer': return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      case 'finance_viewer': return 'bg-income/15 text-income border-income/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getChurchTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      case 'fellowship': return 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30'
      case 'ministry': return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
      default: return 'bg-muted text-muted-foreground border-border'
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
            <h1 className="text-3xl font-bold text-foreground">User Role Management</h1>
            <p className="text-muted-foreground mt-2">View and manage user role assignments across churches</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
              <UserCog className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <span className="text-foreground font-medium">Loading church context...</span>
              <p className="text-muted-foreground text-sm mt-1">Initializing user role management</p>
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
          <h1 className="text-3xl font-bold text-foreground">User Role Management</h1>
          <p className="text-muted-foreground mt-2">View and manage user role assignments across churches</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={exportUserRolesReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/users'}
            variant="secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Grant New Role
          </Button>
        </div>
      </div>

      {/* Church Selection Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Church</CardTitle>
          <CardDescription>User role assignments for the selected church (use header selector to change)</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedChurch ? (
            <div className="flex items-center space-x-3 px-3 py-2 bg-muted rounded-md">
              <Building2 className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-medium truncate">{selectedChurch.name}</div>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">{selectedChurch.type}</Badge>
                  <Badge className="bg-income/15 text-income border-income/30">{selectedChurch.role?.display_name || 'No Role'}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-md">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">No church selected - use the header selector to choose a church</span>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedChurch ? (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
            <Input
              placeholder="Search by user, role, or church..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Roles Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Active Role Assignments - {selectedChurch.name}
              </CardTitle>
              <CardDescription>
                Manage user role assignments for this church
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Loading user roles...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Church</TableHead>
                      <TableHead>Granted By</TableHead>
                      <TableHead>Granted Date</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-foreground">
                                {role.users?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {role.users?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                            {role.roles?.display_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                              {role.churches?.type}
                            </Badge>
                            <span className="text-foreground text-sm">
                              {role.churches?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.granted_by_user?.full_name || role.granted_by_user?.email || 'System'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">
                              {new Date(role.granted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.expires_at ? (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">
                                {new Date(role.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.is_active ? "default" : "destructive"}>
                            {role.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant={role.is_active ? 'destructive' : 'secondary'}
                              size="sm"
                              aria-label={role.is_active ? "Deactivate role assignment" : "Activate role assignment"}
                              onClick={() => handleToggleRole(role.id, role.is_active)}
                            >
                              {role.is_active ? (
                                <Trash2 className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredUserRoles.length === 0 && !loading && (
                <div className="text-center py-8">
                  <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm ? 'No matching roles found' : 'No role assignments'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
                      : 'Grant roles to users to get started'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <UserCog className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">Select a Church</h3>
              <p className="text-muted-foreground mb-4">
                Please select a church from the selector above to view and manage user role assignments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}