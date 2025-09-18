'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Shield, Search, Users, Settings, Edit, Trash2 } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        <span className="ml-3 text-white/70">Loading roles...</span>
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
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <Card key={resource.key} className="bg-slate-700 border-slate-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white">{resource.label}</CardTitle>
                        <CardDescription className="text-xs text-gray-300">
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
                                className="text-sm text-gray-300 cursor-pointer"
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
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-white text-lg">{role.display_name}</CardTitle>
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
                      onClick={() => openEditDialog(role)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id, role.display_name)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {role.description && (
                <CardDescription className="text-gray-300">
                  {role.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
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
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Users className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-8">
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
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <Card key={resource.key} className="bg-slate-700 border-slate-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-white">{resource.label}</CardTitle>
                        <CardDescription className="text-xs text-gray-300">
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
                                className="text-sm text-gray-300 cursor-pointer"
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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