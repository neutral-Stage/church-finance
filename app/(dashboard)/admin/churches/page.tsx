'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Users, Settings, Edit, Trash2, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database } from '@/types/database'

type Church = Database['public']['Tables']['churches']['Row']
type ChurchInsert = Database['public']['Tables']['churches']['Insert']

export default function ChurchesPage() {
  const [churches, setChurches] = useState<Church[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingChurch, setEditingChurch] = useState<Church | null>(null)
  const [formData, setFormData] = useState<ChurchInsert>({
    name: '',
    type: 'church',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    established_date: ''
  })

  useEffect(() => {
    fetchChurches()
  }, [])

  const fetchChurches = async () => {
    try {
      const response = await fetch('/api/churches')
      const data = await response.json()
      
      if (response.ok) {
        setChurches(data.churches || [])
      } else {
        setError(data.error || 'Failed to fetch churches')
      }
    } catch (error) {
      console.error('Error fetching churches:', error)
      setError('Failed to fetch churches')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/churches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setChurches([...churches, data.church])
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        setError(data.error || 'Failed to create church')
      }
    } catch (error) {
      console.error('Error creating church:', error)
      setError('Failed to create church')
    }
  }

  const handleEditChurch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChurch) return
    
    setError('')

    try {
      const response = await fetch(`/api/churches/${editingChurch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setChurches(churches.map(c => c.id === editingChurch.id ? data.church : c))
        setIsEditDialogOpen(false)
        setEditingChurch(null)
        resetForm()
      } else {
        setError(data.error || 'Failed to update church')
      }
    } catch (error) {
      console.error('Error updating church:', error)
      setError('Failed to update church')
    }
  }

  const handleDeleteChurch = async (churchId: string) => {
    if (!confirm('Are you sure you want to delete this church? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/churches/${churchId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setChurches(churches.filter(c => c.id !== churchId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete church')
      }
    } catch (error) {
      console.error('Error deleting church:', error)
      setError('Failed to delete church')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'church',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      established_date: ''
    })
  }

  const openEditDialog = (church: Church) => {
    setEditingChurch(church)
    setFormData({
      name: church.name,
      type: church.type,
      description: church.description || '',
      address: church.address || '',
      phone: church.phone || '',
      email: church.email || '',
      website: church.website || '',
      established_date: church.established_date || ''
    })
    setIsEditDialogOpen(true)
  }

  const filteredChurches = churches.filter(church =>
    church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    church.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (church.description && church.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-100 text-blue-800'
      case 'fellowship': return 'bg-green-100 text-green-800'
      case 'ministry': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-white">Church Management</h1>
          <p className="text-white/70 mt-2">Manage churches, fellowships, and ministries</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <GlassButton variant="success" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Church
            </GlassButton>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Church</DialogTitle>
              <DialogDescription>
                Add a new church, fellowship, or ministry to the system.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateChurch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value: 'church' | 'fellowship' | 'ministry') => setFormData({...formData, type: value})}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="church">Church</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="ministry">Ministry</SelectItem>
                    </SelectContent>
                  </Select>
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
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address ?? ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone ?? ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website ?? ''}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="established_date">Established Date</Label>
                  <Input
                    id="established_date"
                    type="date"
                    value={formData.established_date ?? ''}
                    onChange={(e) => setFormData({...formData, established_date: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <GlassButton type="submit" variant="success">
                  Create Church
                </GlassButton>
                <GlassButton type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </GlassButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search churches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Churches Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredChurches.map((church) => (
          <GlassCard key={church.id} variant="default" animation="fadeIn">
            <GlassCardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <GlassCardTitle className="text-lg">{church.name}</GlassCardTitle>
                  <Badge className={getTypeColor(church.type)}>{church.type}</Badge>
                </div>
                <div className="flex gap-1">
                  <GlassButton
                    variant="info"
                    size="sm"
                    onClick={() => openEditDialog(church)}
                  >
                    <Edit className="w-4 h-4" />
                  </GlassButton>
                  <GlassButton
                    variant="error"
                    size="sm"
                    onClick={() => handleDeleteChurch(church.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
              {church.description && (
                <GlassCardDescription className="">
                  {church.description}
                </GlassCardDescription>
              )}
            </GlassCardHeader>
            
            <GlassCardContent className="space-y-3">
              {church.address && (
                <div className="text-sm text-gray-400">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  {church.address}
                </div>
              )}
              
              {church.phone && (
                <div className="text-sm text-gray-400">
                  {church.phone}
                </div>
              )}
              
              {church.email && (
                <div className="text-sm text-gray-400">
                  {church.email}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-600">
                <span className="text-xs text-gray-500">
                  Created {church.created_at ? new Date(church.created_at).toLocaleDateString() : 'Unknown'}
                </span>
                <div className="flex gap-1">
                  <GlassButton variant="ghost" size="sm">
                    <Users className="w-4 h-4" />
                  </GlassButton>
                  <GlassButton variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      {filteredChurches.length === 0 && (
        <GlassCard variant="default" className="text-center py-8">
          <GlassCardContent className="">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm ? 'No churches found' : 'No churches yet'}
            </h3>
            <p className="text-gray-400">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Create your first church to get started'
              }
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Church</DialogTitle>
            <DialogDescription>
              Update the church information.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditChurch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={formData.type} onValueChange={(value: 'church' | 'fellowship' | 'ministry') => setFormData({...formData, type: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="fellowship">Fellowship</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                  </SelectContent>
                </Select>
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
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address ?? ''}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="bg-slate-700 border-slate-600"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone ?? ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email ?? ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={formData.website ?? ''}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="edit-established_date">Established Date</Label>
                <Input
                  id="edit-established_date"
                  type="date"
                  value={formData.established_date ?? ''}
                  onChange={(e) => setFormData({...formData, established_date: e.target.value})}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <GlassButton type="submit" variant="primary">
                Update Church
              </GlassButton>
              <GlassButton type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </GlassButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}