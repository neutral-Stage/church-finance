'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserCog, Search, Plus, Trash2, Calendar, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChurchSelector } from '@/components/church-selector'
import { ChurchWithRole } from '@/types/database'

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
  const [userRoles, setUserRoles] = useState<UserRoleWithDetails[]>([])
  const [selectedChurch, setSelectedChurch] = useState<ChurchWithRole | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [churchSelectorLoading, setChurchSelectorLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUserRoles = useCallback(async () => {
    if (!selectedChurch) return

    setLoading(true)
    try {
      const response = await fetch(`/api/user-church-roles?church_id=${selectedChurch.id}&include_details=true`)
      const data = await response.json()

      if (response.ok) {
        setUserRoles(data.userChurchRoles || [])
      } else {
        setError(data.error || 'Failed to fetch user roles')
      }
    } catch (error) {
      console.error('Error fetching user roles:', error)
      setError('Failed to fetch user roles')
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  useEffect(() => {
    if (selectedChurch) {
      fetchUserRoles()
    }
  }, [selectedChurch, fetchUserRoles])

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

  if (churchSelectorLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        <span className="ml-3 text-white/70">Loading churches...</span>
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
        
        <Button 
          onClick={() => window.location.href = '/admin/users'}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Grant New Role
        </Button>
      </div>

      {/* Church Selector */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle>Select Church</GlassCardTitle>
          <GlassCardDescription>Choose a church to view user role assignments</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <ChurchSelector
            currentChurch={selectedChurch}
            onChurchChange={setSelectedChurch}
            onLoadingChange={(loading) => setChurchSelectorLoading(loading)}
          />
        </GlassCardContent>
      </GlassCard>

      {selectedChurch ? (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by user, role, or church..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
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
                            <Button
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
              <h3 className="text-xl font-medium text-white mb-2">No Church Available</h3>
              <p className="text-gray-400 mb-4">
                You don&apos;t have access to any churches yet. Contact your system administrator to be granted access.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
              >
                Refresh Page
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}