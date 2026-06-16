'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createAuthenticatedClient } from '@/lib/supabase'
import { useChurch } from '@/contexts/ChurchContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Phone, MapPin, Briefcase, Users, Upload } from 'lucide-react'
import { ImportDialog } from '@/components/import-dialog'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import type { Member } from '@/lib/server-data'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  const { selectedChurch } = useChurch()
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
  const [importOpen, setImportOpen] = useState(false)

  const queryClient = useQueryClient()

  const membersQueryKey = useMemo(
    () => ['members', selectedChurch?.id ?? 'all'] as const,
    [selectedChurch?.id]
  )

  const { data: queriedMembers } = useQuery({
    queryKey: membersQueryKey,
    queryFn: async () => {
      const url = selectedChurch ? `/api/members?church_id=${selectedChurch.id}` : '/api/members'
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch members')
      }
      const data = await response.json()
      return (data.members || []) as Member[]
    },
    initialData: initialData,
    enabled: Boolean(selectedChurch),
  })

  useEffect(() => {
    if (queriedMembers) {
      setMembers(queriedMembers)
    }
  }, [queriedMembers])

  const fetchMembers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: membersQueryKey })
  }, [queryClient, membersQueryKey])

  // Set up real-time subscription only for updates
  useEffect(() => {
    let subscription: RealtimeChannel | null = null
    
    const setupRealtimeSubscription = async () => {
      try {
        const supabase = await createAuthenticatedClient()
        subscription = supabase
          .channel('members_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
            fetchMembers()
          })
          .subscribe()
      } catch (error) {
        console.warn('Failed to setup realtime subscription for members:', error)
        // Fallback to periodic refresh if realtime fails
        const interval = setInterval(fetchMembers, 30000) // 30 seconds
        return () => clearInterval(interval)
      }
    }
    
    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchMembers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permissions.canEdit) {
      toast.error('You do not have permission to modify members')
      return
    }

    // Check if church is selected for new member creation
    if (!editingMember && !selectedChurch) {
      toast.error('Please select a church before adding a member')
      return
    }

    try {
      setSubmitting(true)

      if (editingMember) {
        const response = await fetch('/api/members', {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: editingMember.id,
            ...formData
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update member')
        }
        
        toast.success('Member updated successfully')
      } else {
        const response = await fetch('/api/members', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            church_id: selectedChurch!.id
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to add member')
        }
        
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
      const response = await fetch(`/api/members?id=${member.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete member')
      }
      
      toast.success('Member deleted successfully')
      fetchMembers() // Refresh the list
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Members Management
            </h1>
            <p className="text-muted-foreground">
              Manage brothers and sisters database with personal information
            </p>
          </div>
          {permissions.canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            <Button 
              onClick={openAddDialog}
              className="hover:scale-105 transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.1s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              <div className="p-2 bg-primary/15 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={members.length} />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.2s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fellowships</CardTitle>
              <div className="p-2 bg-income/15 rounded-lg">
                <Users className="h-4 w-4 text-income" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={new Set(members.filter(m => m.fellowship_name).map(m => m.fellowship_name)).size} />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.3s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Phone</CardTitle>
              <div className="p-2 bg-purple-500/15 rounded-lg">
                <Phone className="h-4 w-4 text-purple-700 dark:text-purple-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={members.filter(m => m.phone).length} />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.4s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Jobs</CardTitle>
              <div className="p-2 bg-pending/15 rounded-lg">
                <Briefcase className="h-4 w-4 text-pending" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={members.filter(m => m.job).length} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.5s'}}>
          <Input
            placeholder="Search members by name, fellowship, or job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Members Table */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.6s'}}>
          <CardHeader>
            <CardTitle>Members List</CardTitle>
            <CardDescription>
              A list of all brothers and sisters with their personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Fellowship</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Location</TableHead>
                  {(permissions.canEdit || permissions.canDelete) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="transition-colors">
                    <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                    <TableCell>
                      {member.phone ? (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="mr-1 h-3 w-3" />
                          {member.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.fellowship_name ? (
                        <Badge variant="secondary">{member.fellowship_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.job ? (
                        <div className="flex items-center text-muted-foreground">
                          <Briefcase className="mr-1 h-3 w-3" />
                          {member.job}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.location ? (
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="mr-1 h-3 w-3" />
                          {member.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
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
                              aria-label={`Edit ${member.name}`}
                              className="hover:scale-105 transition-all duration-300"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(member)}
                              aria-label={`Delete ${member.name}`}
                              className="hover:scale-105 transition-all duration-300 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
              <div className="text-center py-8 text-muted-foreground">
                No members found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Member Dialog */}
        {permissions.canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </DialogTitle>
                <DialogDescription>
                  {editingMember ? 'Update member information' : 'Add a new brother or sister to the database'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+8801XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fellowship_name">Fellowship/Church Name</Label>
                  <Input
                    id="fellowship_name"
                    value={formData.fellowship_name}
                    onChange={(e) => setFormData({ ...formData, fellowship_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job">Job/Occupation</Label>
                  <Input
                    id="job"
                    value={formData.job}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingMember ? 'Update' : 'Add'} Member
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {selectedChurch?.id && (
          <ImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            importType="members"
            churchId={selectedChurch.id}
            memberMode="direct"
            onSuccess={fetchMembers}
          />
        )}
      </div>
    </div>
  )
}