'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle, GlassCardFooter } from '@/components/ui/glass-card'
import { GlassButton, GlassButtonGroup } from '@/components/ui/glass-button'
import { GlassTable, GlassTableHeader, GlassTableBody, GlassTableRow, GlassTableHead, GlassTableCell, GlassTableEmpty, GlassTableLoading } from '@/components/ui/glass-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Shield, Search, Users, Settings, Edit, Trash2, BarChart3, Eye, CheckCircle2, XCircle, Clock, Crown, Zap, Download, TrendingUp, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database } from '@/types/database'

type Role = Database['public']['Tables']['roles']['Row']
type RoleInsert = Database['public']['Tables']['roles']['Insert']

// Define ChurchPermissions type based on the structure used in the app
interface ChurchPermissions {
  [resource: string]: Record<string, boolean>
}

const PERMISSION_RESOURCES = [
  { key: 'churches', label: 'Churches', description: 'Manage church/fellowship/ministry organizations' },
  { key: 'users', label: 'Users', description: 'Manage user accounts and access' },
  { key: 'roles', label: 'Roles', description: 'Manage roles and permissions' },
  { key: 'funds', label: 'Funds', description: 'Manage fund accounts' },
  { key: 'transactions', label: 'Transactions', description: 'Manage financial transactions' },
  { key: 'offerings', label: 'Offerings', description: 'Manage offering records' },
  { key: 'bills', label: 'Bills', description: 'Manage bills and expenses' },
  { key: 'advances', label: 'Advances', description: 'Manage advance payments' },
  { key: 'reports', label: 'Reports', description: 'Generate and view financial reports' },
  { key: 'members', label: 'Members', description: 'Manage church member records' },
]

const PERMISSION_ACTIONS = [
  { key: 'create', label: 'Create', description: 'Can create new records' },
  { key: 'read', label: 'View', description: 'Can view and read records' },
  { key: 'update', label: 'Edit', description: 'Can modify existing records' },
  { key: 'delete', label: 'Delete', description: 'Can delete records' },
]

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'permissions'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<RoleInsert>({
    name: '',
    display_name: '',
    description: '',
    permissions: {}
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles')
      const data = await response.json()
      
      if (response.ok) {
        setRoles(data.roles || [])
      } else {
        setError(data.error || 'Failed to fetch roles')
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      setError('Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setRoles([...roles, data.role])
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        setError(data.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      setError('Failed to create role')
    }
  }

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    
    setError('')

    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setRoles(roles.map(r => r.id === editingRole.id ? data.role : r))
        setIsEditDialogOpen(false)
        setEditingRole(null)
        resetForm()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      setError('Failed to update role')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: {}
    })
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permissions: role.permissions as ChurchPermissions
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setRoles(roles.filter(r => r.id !== roleId))
      } else {
        setError(data.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      setError('Failed to delete role')
    }
  }

  const updatePermission = (resource: string, action: string, value: boolean) => {
    const newPermissions = { ...(formData.permissions as ChurchPermissions || {}) }
    if (!newPermissions[resource as keyof ChurchPermissions]) {
      newPermissions[resource as keyof ChurchPermissions] = {} as Record<string, boolean>
    }
    const resourcePerms = newPermissions[resource as keyof ChurchPermissions] as Record<string, boolean>
    resourcePerms[action] = value
    setFormData({ ...formData, permissions: newPermissions })
  }

  const getPermissionValue = (resource: string, action: string): boolean => {
    const permissions = formData.permissions as ChurchPermissions || {}
    const resourcePerms = permissions[resource as keyof ChurchPermissions] as Record<string, boolean> | undefined
    return resourcePerms?.[action] || false
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const generateRoleName = (displayName: string) => {
    return displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  }

  const getPermissionCount = (permissions: ChurchPermissions) => {
    return Object.values(permissions).reduce((total, resourcePerms) => {
      return total + Object.values(resourcePerms as Record<string, boolean>).filter(Boolean).length
    }, 0)
  }

  const getRoleTypeIcon = (roleName: string) => {
    if (roleName.includes('admin')) return <Crown className="w-4 h-4" />
    if (roleName.includes('treasurer')) return <BarChart3 className="w-4 h-4" />
    if (roleName.includes('viewer')) return <Eye className="w-4 h-4" />
    return <Shield className="w-4 h-4" />
  }

  const getRolePriorityColor = (roleName: string) => {
    if (roleName.includes('super_admin')) return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (roleName.includes('admin')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    if (roleName.includes('treasurer')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    return 'bg-green-500/20 text-green-300 border-green-500/30'
  }

  const exportRolesReport = () => {
    try {
      const csvContent = generateCSVReport(roles)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roles-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Failed to export report')
    }
  }

  const generateCSVReport = (roles: Role[]) => {
    const headers = [
      'Role Name', 'Display Name', 'Type', 'Status', 'Permission Count',
      'Created Date', 'Description'
    ]

    const rows = roles.map(role => [
      role.name,
      role.display_name,
      role.is_system_role ? 'System' : 'Custom',
      role.is_active ? 'Active' : 'Inactive',
      getPermissionCount(role.permissions as ChurchPermissions || {}),
      role.created_at ? new Date(role.created_at).toLocaleDateString() : '',
      role.description || ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const getSystemSummary = () => {
    const activeRoles = roles.filter(r => r.is_active).length
    const systemRoles = roles.filter(r => r.is_system_role).length
    const customRoles = roles.filter(r => !r.is_system_role).length
    const totalPermissions = roles.reduce((total, role) =>
      total + getPermissionCount(role.permissions as ChurchPermissions || {}), 0
    )

    return {
      totalRoles: roles.length,
      activeRoles,
      systemRoles,
      customRoles,
      totalPermissions,
      avgPermissionsPerRole: roles.length ? Math.round(totalPermissions / roles.length) : 0
    }
  }

  const summary = getSystemSummary()

  const sortedAndFilteredRoles = roles
    .filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'created':
          aValue = new Date(a.created_at || '')
          bValue = new Date(b.created_at || '')
          break
        case 'permissions':
          aValue = getPermissionCount(a.permissions as ChurchPermissions || {})
          bValue = getPermissionCount(b.permissions as ChurchPermissions || {})
          break
        default: // name
          aValue = a.display_name.toLowerCase()
          bValue = b.display_name.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Role Management</h1>
            <p className="text-white/70 mt-2">Create and manage user roles and permissions</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400/30 border-t-purple-400"></div>
              <Shield className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <div className="text-center">
              <span className="text-white font-medium">Loading roles...</span>
              <p className="text-white/60 text-sm mt-1">Fetching role definitions and permissions</p>
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
          <h1 className="text-3xl font-bold text-white">Role Management</h1>
          <p className="text-white/70 mt-2">Create and manage user roles and permissions</p>
        </div>

        <div className="flex gap-2">
          <GlassButton variant="primary" onClick={exportRolesReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <GlassButton onClick={resetForm} variant="success">
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </GlassButton>
            </DialogTrigger>
            <DialogContent className="bg-slate-900/95 backdrop-blur-2xl border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role with specific permissions for your organization.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateRole} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => {
                      const displayName = e.target.value
                      setFormData({
                        ...formData, 
                        display_name: displayName,
                        name: generateRoleName(displayName)
                      })
                    }}
                    required
                    className="bg-slate-700 border-slate-600"
                    placeholder="e.g., Financial Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="name">System Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                    placeholder="Auto-generated"
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-generated from display name</p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                  rows={3}
                  placeholder="Brief description of this role and its responsibilities"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                <div className="space-y-4">
                  {PERMISSION_RESOURCES.map((resource) => (
                    <GlassCard key={resource.key} variant="default">
                      <GlassCardHeader className="pb-3">
                        <GlassCardTitle className="text-sm">{resource.label}</GlassCardTitle>
                        <GlassCardDescription className="text-xs">
                          {resource.description}
                        </GlassCardDescription>
                      </GlassCardHeader>
                      <GlassCardContent>
                        <div className="grid grid-cols-4 gap-4">
                          {PERMISSION_ACTIONS.map((action) => (
                            <div key={action.key} className="flex items-center space-x-2">
                              <Switch
                                id={`${resource.key}-${action.key}`}
                                checked={getPermissionValue(resource.key, action.key)}
                                onCheckedChange={(checked) => updatePermission(resource.key, action.key, checked)}
                              />
                              <Label 
                                htmlFor={`${resource.key}-${action.key}`}
                                className="text-sm text-gray-300 cursor-pointer"
                                title={action.description}
                              >
                                {action.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <GlassButton type="submit" variant="success">
                  Create Role
                </GlassButton>
                <GlassButton type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </GlassButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* System Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="primary">
          <GlassCardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-white/70 text-sm">Total Roles</p>
              <p className="text-2xl font-bold text-white">{summary.totalRoles}</p>
              <p className="text-xs text-purple-400">{summary.activeRoles} active</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="info">
          <GlassCardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-white/70 text-sm">System Roles</p>
              <p className="text-2xl font-bold text-white">{summary.systemRoles}</p>
              <p className="text-xs text-blue-400">Built-in</p>
            </div>
            <Crown className="w-8 h-8 text-blue-400" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="success">
          <GlassCardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-white/70 text-sm">Custom Roles</p>
              <p className="text-2xl font-bold text-white">{summary.customRoles}</p>
              <p className="text-xs text-green-400">User-defined</p>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="warning">
          <GlassCardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-white/70 text-sm">Avg Permissions</p>
              <p className="text-2xl font-bold text-white">{summary.avgPermissionsPerRole}</p>
              <p className="text-xs text-yellow-400">Per role</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Filters and Search */}
      <GlassCard>
        <GlassCardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:border-white/30"
              />
            </div>

            <GlassButtonGroup spacing="sm">
              <GlassButton
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Grid
              </GlassButton>
              <GlassButton
                variant={viewMode === 'table' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Table
              </GlassButton>
            </GlassButtonGroup>

            <div className="flex gap-2">
              <Input
                placeholder="Sort by..."
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'permissions')}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <GlassButton
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </GlassButton>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedAndFilteredRoles.map((role) => (
          <GlassCard key={role.id} variant="default" animation="fadeIn" className="hover:scale-[1.02]">
            <GlassCardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <GlassCardTitle className="text-lg">{role.display_name}</GlassCardTitle>
                  <div className="flex gap-2">
                    {role.is_system_role && (
                      <Badge variant="secondary" className="text-xs">System Role</Badge>
                    )}
                    <Badge variant={role.is_active ? "default" : "destructive"} className="text-xs">
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {!role.is_system_role && (
                  <div className="flex gap-1">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id, role.display_name)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlassButton>
                  </div>
                )}
              </div>
              {role.description && (
                <GlassCardDescription>
                  {role.description}
                </GlassCardDescription>
              )}
            </GlassCardHeader>

            <GlassCardContent className="space-y-3">
              <div className="text-sm text-gray-400">
                <strong>System Name:</strong> {role.name}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(role.permissions as ChurchPermissions).map(([resource, permissions]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const activeActions = Object.entries(permissions || {} as Record<string, boolean>)
                      .filter(([, value]) => value)
                      .map(([action]) => action)
                    
                    if (activeActions.length === 0) return null
                    
                    return (
                      <Badge 
                        key={resource} 
                        variant="outline" 
                        className="text-xs bg-slate-700 border-slate-600"
                      >
                        {resource}: {activeActions.join(', ')}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                <span className="text-xs text-gray-500">
                  Created {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'Unknown'}
                </span>
                <div className="flex gap-1">
                  <GlassButton variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Users className="w-4 h-4" />
                  </GlassButton>
                  <GlassButton variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Settings className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      {sortedAndFilteredRoles.length === 0 && (
        <GlassCard variant="default">
          <GlassCardContent className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm ? 'No roles found' : 'No roles yet'}
            </h3>
            <p className="text-gray-400">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Create your first role to get started'
              }
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-2xl border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role permissions and details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditRole} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-display_name">Display Name *</Label>
                <Input
                  id="edit-display_name"
                  value={formData.display_name}
                  onChange={(e) => {
                    const displayName = e.target.value
                    setFormData({
                      ...formData,
                      display_name: displayName,
                      name: editingRole?.is_system_role ? editingRole.name : generateRoleName(displayName)
                    })
                  }}
                  required
                  className="bg-slate-700 border-slate-600"
                  placeholder="e.g., Financial Manager"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">System Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Auto-generated"
                  disabled={editingRole?.is_system_role ?? false}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {editingRole?.is_system_role ? 'System role name cannot be changed' : 'Auto-generated from display name'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description ?? ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-slate-700 border-slate-600"
                rows={3}
                placeholder="Brief description of this role and its responsibilities"
              />
            </div>

            {!editingRole?.is_system_role && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                <div className="space-y-4">
                  {PERMISSION_RESOURCES.map((resource) => (
                    <GlassCard key={resource.key} variant="default">
                      <GlassCardHeader className="pb-3">
                        <GlassCardTitle className="text-sm">{resource.label}</GlassCardTitle>
                        <GlassCardDescription className="text-xs">
                          {resource.description}
                        </GlassCardDescription>
                      </GlassCardHeader>
                      <GlassCardContent>
                        <div className="grid grid-cols-4 gap-4">
                          {PERMISSION_ACTIONS.map((action) => (
                            <div key={action.key} className="flex items-center space-x-2">
                              <Switch
                                id={`edit-${resource.key}-${action.key}`}
                                checked={getPermissionValue(resource.key, action.key)}
                                onCheckedChange={(checked) => updatePermission(resource.key, action.key, checked)}
                              />
                              <Label
                                htmlFor={`edit-${resource.key}-${action.key}`}
                                className="text-sm text-gray-300 cursor-pointer"
                                title={action.description}
                              >
                                {action.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </GlassCardContent>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {editingRole?.is_system_role && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Note:</strong> This is a system role. Only the display name and description can be modified.
                  Permissions are managed by the system.
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <GlassButton type="submit" variant="primary">
                Update Role
              </GlassButton>
              <GlassButton
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingRole(null)
                  resetForm()
                }}
              >
                Cancel
              </GlassButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}