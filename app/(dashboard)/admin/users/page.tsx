'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, Search, UserPlus, Shield, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  const filteredRoles = userChurchRoles.filter(ucr =>
    ucr.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ucr.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ucr.roles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        <span className="ml-3 text-white/70">Loading users...</span>
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
        
        <Dialog open={isGrantRoleDialogOpen} onOpenChange={setIsGrantRoleDialogOpen}>
          <DialogTrigger asChild>
            <GlassButton onClick={resetGrantRoleForm} variant="success">
              <UserPlus className="w-4 h-4 mr-2" />
              Grant Role
            </GlassButton>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
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
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Grant Role
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsGrantRoleDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
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
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Granted By</TableHead>
                    <TableHead className="text-gray-300">Granted Date</TableHead>
                    <TableHead className="text-gray-300">Expires</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((ucr) => (
                    <TableRow key={ucr.id} className="border-slate-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {ucr.users?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-400">
                            {ucr.users?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(ucr.roles?.name)}>
                          {ucr.roles?.display_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {ucr.granted_by?.full_name || ucr.granted_by?.email || 'System'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(ucr.granted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {ucr.expires_at ? new Date(ucr.expires_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ucr.is_active ? "default" : "destructive"}>
                          {ucr.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ucr.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeRole(ucr.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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