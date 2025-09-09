'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Phone, MapPin, Briefcase, Users } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import type { Member } from '@/lib/server-data'

interface MemberFormData {
  name: string
  phone: string
  fellowship_name: string
  job: string
  location: string
}

interface MembersClientProps {
  initialData: Member[]
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canApprove: boolean
    userRole: string | null
  }
}

export function MembersClient({ initialData, permissions }: MembersClientProps) {
  const [members, setMembers] = useState<Member[]>(initialData)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    phone: '',
    fellowship_name: '',
    job: '',
    location: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load members')
      return
    }
    setMembers(data || [])
  }, [])

  // Set up real-time subscription only for updates
  useEffect(() => {
    const subscription = supabase
      .channel('members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchMembers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchMembers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permissions.canEdit) {
      toast.error('You do not have permission to modify members')
      return
    }

    try {
      setSubmitting(true)

      if (editingMember) {
        const updateData = {
          ...formData,
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', editingMember.id)

        if (error) throw error
        toast.success('Member updated successfully')
      } else {
        const { error } = await supabase
          .from('members')
          .insert([formData])

        if (error) throw error
        toast.success('Member added successfully')
      }

      setIsDialogOpen(false)
      setEditingMember(null)
      resetForm()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (member: Member) => {
    if (!permissions.canEdit) {
      toast.error('You do not have permission to edit members')
      return
    }

    setEditingMember(member)
    setFormData({
      name: member.name,
      phone: member.phone || '',
      fellowship_name: member.fellowship_name || '',
      job: member.job || '',
      location: member.location || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (member: Member) => {
    if (!permissions.canDelete) {
      toast.error('You do not have permission to delete members')
      return
    }

    if (!confirm('Are you sure you want to delete this member?')) return

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id)

      if (error) throw error
      toast.success('Member deleted successfully')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      fellowship_name: '',
      job: '',
      location: ''
    })
  }

  const openAddDialog = () => {
    setEditingMember(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.fellowship_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.job?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>
      
      <div className="relative z-10 container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Members Management
            </h1>
            <p className="text-white/70">
              Manage brothers and sisters database with personal information
            </p>
          </div>
          {permissions.canEdit && (
            <Button 
              onClick={openAddDialog}
              className="glass-button hover:scale-105 transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.1s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total Members</CardTitle>
              <div className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-lg">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                <AnimatedCounter value={members.length} />
              </div>
            </CardContent>
          </div>
          <div className="glass-card hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.2s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Fellowships</CardTitle>
              <div className="p-2 bg-green-500/20 backdrop-blur-sm rounded-lg">
                <Users className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                <AnimatedCounter value={new Set(members.filter(m => m.fellowship_name).map(m => m.fellowship_name)).size} />
              </div>
            </CardContent>
          </div>
          <div className="glass-card hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.3s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">With Phone</CardTitle>
              <div className="p-2 bg-purple-500/20 backdrop-blur-sm rounded-lg">
                <Phone className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                <AnimatedCounter value={members.filter(m => m.phone).length} />
              </div>
            </CardContent>
          </div>
          <div className="glass-card hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.4s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">With Jobs</CardTitle>
              <div className="p-2 bg-orange-500/20 backdrop-blur-sm rounded-lg">
                <Briefcase className="h-4 w-4 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">
                <AnimatedCounter value={members.filter(m => m.job).length} />
              </div>
            </CardContent>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.5s'}}>
          <Input
            placeholder="Search members by name, fellowship, or job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm glass-input"
          />
        </div>

        {/* Members Table */}
        <div className="glass-card animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.6s'}}>
          <CardHeader>
            <CardTitle className="text-white/90">Members List</CardTitle>
            <CardDescription className="text-white/60">
              A list of all brothers and sisters with their personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/80">Name</TableHead>
                  <TableHead className="text-white/80">Phone</TableHead>
                  <TableHead className="text-white/80">Fellowship</TableHead>
                  <TableHead className="text-white/80">Job</TableHead>
                  <TableHead className="text-white/80">Location</TableHead>
                  {(permissions.canEdit || permissions.canDelete) && <TableHead className="text-white/80">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-white/90">{member.name}</TableCell>
                    <TableCell>
                      {member.phone ? (
                        <div className="flex items-center text-white/80">
                          <Phone className="mr-1 h-3 w-3" />
                          {member.phone}
                        </div>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.fellowship_name ? (
                        <Badge variant="secondary" className="bg-white/10 text-white/90 border-white/20">{member.fellowship_name}</Badge>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.job ? (
                        <div className="flex items-center text-white/80">
                          <Briefcase className="mr-1 h-3 w-3" />
                          {member.job}
                        </div>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.location ? (
                        <div className="flex items-center text-white/80">
                          <MapPin className="mr-1 h-3 w-3" />
                          {member.location}
                        </div>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    {(permissions.canEdit || permissions.canDelete) && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {permissions.canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(member)}
                              className="glass-button-outline hover:scale-105 transition-all duration-300"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(member)}
                              className="glass-button-outline hover:scale-105 transition-all duration-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-white/60">
                No members found
              </div>
            )}
          </CardContent>
        </div>

        {/* Add/Edit Member Dialog */}
        {permissions.canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-white/90">
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  {editingMember ? 'Update member information' : 'Add a new brother or sister to the database'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/90">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/90">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+8801XXXXXXXXX"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fellowship_name" className="text-white/90">Fellowship/Church Name</Label>
                  <Input
                    id="fellowship_name"
                    value={formData.fellowship_name}
                    onChange={(e) => setFormData({ ...formData, fellowship_name: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job" className="text-white/90">Job/Occupation</Label>
                  <Input
                    id="job"
                    value={formData.job}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white/90">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="glass-button-outline"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="glass-button"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingMember ? 'Update' : 'Add'} Member
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}