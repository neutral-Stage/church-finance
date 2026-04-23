'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTable, GlassTableHeader, GlassTableBody, GlassTableRow, GlassTableHead, GlassTableCell } from '@/components/ui/glass-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, Search, UserPlus, Shield, X, Download, TrendingUp, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChurchSelector } from '@/components/church-selector'
import { Database } from '@/types/database'

type Church = Database['public']['Tables']['churches']['Row']
type Role = Database['public']['Tables']['roles']['Row']
type UserChurchRole = Database['public']['Tables']['user_church_roles']['Row']
type User = Database['public']['Tables']['users']['Row']

// Define ChurchWithRole based on the application structure
interface ChurchWithRole extends Church {
  role?: Role
  user_church_role?: UserChurchRole
}

interface UserWithChurchRoles extends User {
  church_roles: Array<{
    id: string
    church: Church
    role: Role
    user_church_role: UserChurchRole
    granted_by?: { full_name: string; email: string }
  }>
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithChurchRoles[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedChurch, setSelectedChurch] = useState<ChurchWithRole | undefined>(undefined)
  const [userChurchRoles, setUserChurchRoles] = useState<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isGrantRoleDialogOpen, setIsGrantRoleDialogOpen] = useState(false)
  const [grantRoleForm, setGrantRoleForm] = useState({
    user_id: '',
    church_id: '',
    role_id: '',
    expires_at: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [selectedChurch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedChurch) {
      fetchUserChurchRoles()
    }
  }, [selectedChurch]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [usersRes, churchesRes, rolesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/churches'),
        fetch('/api/roles')
      ])

      const [usersData, churchesData, rolesData] = await Promise.all([
        usersRes.json(),
        churchesRes.json(),
        rolesRes.json()
      ])

      if (usersRes.ok) setUsers(usersData.users || [])
      if (churchesRes.ok && churchesData.churches?.length > 0 && !selectedChurch) {
        const userChurches = churchesData.churches?.map((church: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          ...church,
          role: church.user_church_roles[0]?.roles,
          user_church_role: church.user_church_roles[0]
        })) || []
        setSelectedChurch(userChurches[0])
      }
      if (rolesRes.ok) setRoles(rolesData.roles || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserChurchRoles = async () => {
    if (!selectedChurch) return

    try {
      const response = await fetch(`/api/user-church-roles?church_id=${selectedChurch.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setUserChurchRoles(data.userChurchRoles || [])
      } else {
        setError(data.error || 'Failed to fetch user roles')
      }
    } catch (error) {
      console.error('Error fetching user church roles:', error)
      setError('Failed to fetch user roles')
    }
  }

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/user-church-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...grantRoleForm,
          church_id: selectedChurch?.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserChurchRoles([...userChurchRoles, data.userChurchRole])
        setIsGrantRoleDialogOpen(false)
        resetGrantRoleForm()
      } else {
        setError(data.error || 'Failed to grant role')
      }
    } catch (error) {
      console.error('Error granting role:', error)
      setError('Failed to grant role')
    }
  }

  const handleRevokeRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to revoke this role?')) {
      return
    }

    try {
      const response = await fetch('/api/user-church-roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: roleId,
          is_active: false
        }),
      })

      if (response.ok) {
        setUserChurchRoles(userChurchRoles.map(ucr => 
          ucr.id === roleId ? { ...ucr, is_active: false } : ucr
        ))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to revoke role')
      }
    } catch (error) {
      console.error('Error revoking role:', error)
      setError('Failed to revoke role')
    }
  }

  const resetGrantRoleForm = () => {
    setGrantRoleForm({
      user_id: '',
      church_id: '',
      role_id: '',
      expires_at: '',
      notes: ''
    })
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

  const exportUsersReport = () => {
    try {
      const csvContent = generateCSVReport(filteredRoles)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-report-${selectedChurch?.name || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Failed to export report')
    }
  }

  const generateCSVReport = (roles: any[]) => {
    const headers = [
      'User Name', 'User Email', 'Role', 'Church',
      'Status', 'Granted By', 'Granted Date', 'Expires', 'Notes'
    ]

    const rows = roles.map(ucr => [
      ucr.users?.full_name || 'Unknown',
      ucr.users?.email || '',
      ucr.roles?.display_name || '',
      selectedChurch?.name || '',
      ucr.is_active ? 'Active' : 'Inactive',
      ucr.granted_by?.full_name || ucr.granted_by?.email || 'System',
      new Date(ucr.granted_at).toLocaleDateString(),
      ucr.expires_at ? new Date(ucr.expires_at).toLocaleDateString() : 'Never',
      ucr.notes || ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const filteredRoles = userChurchRoles.filter(ucr =>
    ucr.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ucr.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ucr.roles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-white/70 mt-2">Manage user access and permissions</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400/30 border-t-purple-400"></div>
              <Users className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div className="text-center">
              <span className="text-white font-medium">Loading users...</span>
              <p className="text-white/60 text-sm mt-1">Fetching user data and permissions</p>
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
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-white/70 mt-2">Manage user access and permissions</p>
        </div>
        
        <div className="flex gap-2">
          <GlassButton variant="primary" onClick={exportUsersReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
          <Dialog open={isGrantRoleDialogOpen} onOpenChange={setIsGrantRoleDialogOpen}>
            <DialogTrigger asChild>
              <GlassButton onClick={resetGrantRoleForm} variant="success">
                <UserPlus className="w-4 h-4 mr-2" />
                Grant Role
              </GlassButton>
            </DialogTrigger>
          <DialogContent className="bg-slate-900/95 backdrop-blur-2xl border-white/20 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Grant User Role</DialogTitle>
              <DialogDescription>
                Assign a role to a user for the selected church.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleGrantRole} className="space-y-4">
              <div>
                <Label htmlFor="user_id">User *</Label>
                <Select value={grantRoleForm.user_id} onValueChange={(value) => setGrantRoleForm({...grantRoleForm, user_id: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role_id">Role *</Label>
                <Select value={grantRoleForm.role_id} onValueChange={(value) => setGrantRoleForm({...grantRoleForm, role_id: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={grantRoleForm.expires_at}
                  onChange={(e) => setGrantRoleForm({...grantRoleForm, expires_at: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={grantRoleForm.notes}
                  onChange={(e) => setGrantRoleForm({...grantRoleForm, notes: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                  rows={3}
                  placeholder="Reason for granting this role or any special notes"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <GlassButton type="submit" variant="success">
                  Grant Role
                </GlassButton>
                <GlassButton type="button" variant="outline" onClick={() => setIsGrantRoleDialogOpen(false)}>
                  Cancel
                </GlassButton>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Church Selector */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle>Select Church</GlassCardTitle>
          <GlassCardDescription>Choose a church to manage user roles for</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <ChurchSelector 
            currentChurch={selectedChurch} 
            onChurchChange={setSelectedChurch}
          />
        </GlassCardContent>
      </GlassCard>

      {selectedChurch && (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:border-white/30"
            />
          </div>

          {/* User Roles Table */}
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users with Access to {selectedChurch.name}
              </GlassCardTitle>
              <GlassCardDescription>
                Manage user roles and permissions for this church
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <GlassTable>
                <GlassTableHeader>
                  <GlassTableRow>
                    <GlassTableHead>User</GlassTableHead>
                    <GlassTableHead>Role</GlassTableHead>
                    <GlassTableHead>Granted By</GlassTableHead>
                    <GlassTableHead>Granted Date</GlassTableHead>
                    <GlassTableHead>Expires</GlassTableHead>
                    <GlassTableHead>Status</GlassTableHead>
                    <GlassTableHead>Actions</GlassTableHead>
                  </GlassTableRow>
                </GlassTableHeader>
                <GlassTableBody>
                  {filteredRoles.map((ucr) => (
                    <GlassTableRow key={ucr.id}>
                      <GlassTableCell>
                        <div>
                          <div className="font-medium text-white">
                            {ucr.users?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {ucr.users?.email}
                          </div>
                        </div>
                      </GlassTableCell>
                      <GlassTableCell>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          {ucr.roles?.display_name}
                        </Badge>
                      </GlassTableCell>
                      <GlassTableCell className="text-gray-300">
                        {ucr.granted_by?.full_name || ucr.granted_by?.email || 'System'}
                      </GlassTableCell>
                      <GlassTableCell className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">
                            {new Date(ucr.granted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </GlassTableCell>
                      <GlassTableCell className="text-gray-300">
                        {ucr.expires_at ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">
                              {new Date(ucr.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Never</span>
                        )}
                      </GlassTableCell>
                      <GlassTableCell>
                        <Badge variant={ucr.is_active ? "default" : "destructive"}>
                          {ucr.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </GlassTableCell>
                      <GlassTableCell>
                        <div className="flex gap-1">
                          {ucr.is_active && (
                            <GlassButton
                              variant="error"
                              size="sm"
                              onClick={() => handleRevokeRole(ucr.id)}
                            >
                              <X className="w-4 h-4" />
                            </GlassButton>
                          )}
                        </div>
                      </GlassTableCell>
                    </GlassTableRow>
                  ))}
                </GlassTableBody>
              </GlassTable>

              {filteredRoles.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {searchTerm ? 'No users found' : 'No users with access'}
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
      )}
    </div>
  )
}