'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button, } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
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
    if (roleName.includes('super_admin')) return 'bg-destructive/15 text-destructive border-destructive/30'
    if (roleName.includes('admin')) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
    if (roleName.includes('treasurer')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
    return 'bg-income/15 text-income border-income/30'
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
            <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
            <p className="text-muted-foreground mt-2">Create and manage user roles and permissions</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
              <Shield className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <span className="text-foreground font-medium">Loading roles...</span>
              <p className="text-muted-foreground text-sm mt-1">Fetching role definitions and permissions</p>
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
          <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-2">Create and manage user roles and permissions</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={exportRolesReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    placeholder="e.g., Financial Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="name">System Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className=""
                    placeholder="Auto-generated"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">Auto-generated from display name</p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className=""
                  rows={3}
                  placeholder="Brief description of this role and its responsibilities"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Permissions</h3>
                <div className="space-y-4">
                  {PERMISSION_RESOURCES.map((resource) => (
                    <Card key={resource.key}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{resource.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
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
                                className="text-sm text-muted-foreground cursor-pointer"
                                title={action.description}
                              >
                                {action.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  Create Role
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* System Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-sm">Total Roles</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalRoles}</p>
              <p className="text-xs text-primary">{summary.activeRoles} active</p>
            </div>
            <Shield className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-sm">System Roles</p>
              <p className="text-2xl font-bold text-foreground">{summary.systemRoles}</p>
              <p className="text-xs text-primary">Built-in</p>
            </div>
            <Crown className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-sm">Custom Roles</p>
              <p className="text-2xl font-bold text-foreground">{summary.customRoles}</p>
              <p className="text-xs text-income">User-defined</p>
            </div>
            <Users className="w-8 h-8 text-income" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-sm">Avg Permissions</p>
              <p className="text-2xl font-bold text-foreground">{summary.avgPermissionsPerRole}</p>
              <p className="text-xs text-pending">Per role</p>
            </div>
            <TrendingUp className="w-8 h-8 text-pending" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Sort by..."
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'permissions')}
                className="bg-muted border-border text-foreground"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedAndFilteredRoles.map((role) => (
          <Card key={role.id} className="hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{role.display_name}</CardTitle>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Edit role"
                      onClick={() => openEditDialog(role)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete role"
                      onClick={() => handleDeleteRole(role.id, role.display_name)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {role.description && (
                <CardDescription>
                  {role.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <strong>System Name:</strong> {role.name}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Permissions</h4>
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
                        className="text-xs bg-muted text-muted-foreground border-border"
                      >
                        {resource}: {activeActions.join(', ')}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Created {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'Unknown'}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" aria-label="View role users" className="text-muted-foreground hover:text-foreground">
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Role settings" className="text-muted-foreground hover:text-foreground">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedAndFilteredRoles.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'No roles found' : 'No roles yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Create your first role to get started'
              }
            </p>
          </CardContent>
        </Card>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  className=""
                  placeholder="e.g., Financial Manager"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">System Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  className=""
                  placeholder="Auto-generated"
                  disabled={editingRole?.is_system_role ?? false}
                />
                <p className="text-xs text-muted-foreground mt-1">
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
                className=""
                rows={3}
                placeholder="Brief description of this role and its responsibilities"
              />
            </div>

            {!editingRole?.is_system_role && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Permissions</h3>
                <div className="space-y-4">
                  {PERMISSION_RESOURCES.map((resource) => (
                    <Card key={resource.key}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{resource.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
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
                                className="text-sm text-muted-foreground cursor-pointer"
                                title={action.description}
                              >
                                {action.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {editingRole?.is_system_role && (
              <div className="bg-pending/15 border border-pending/30 rounded-lg p-4">
                <p className="text-pending text-sm">
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
              <Button type="submit">
                Update Role
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingRole(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}