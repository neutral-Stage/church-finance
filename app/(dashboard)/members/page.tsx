'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Phone, MapPin, Briefcase, Users, Loader2 } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface Member {
  id: string;
  name: string;
  phone?: string;
  fellowship_name?: string;
  job?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

interface MemberFormData {
  name: string;
  phone: string;
  fellowship_name: string;
  job: string;
  location: string;
}

export default function MembersPage() {
  const { user, session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    phone: '',
    fellowship_name: '',
    job: '',
    location: ''
  });

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check authentication state before making request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Current session:', session)
      console.log('Session error:', sessionError)
      
      if (!session) {
        console.warn('No active session found')
        toast.error('Please log in to access members data')
        return
      }
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name')
      
      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug logging - Authentication status
    console.log('=== MEMBER SAVE DEBUG START ===');
    console.log('User authenticated:', !!user);
    console.log('User details:', user);
    console.log('Session exists:', !!session);
    console.log('Session details:', session);
    
    // Check current session before proceeding
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session check:', currentSession)
    console.log('Session check error:', sessionError)
    
    if (!currentSession) {
      console.error('No active session found during save operation')
      toast.error('Please log in to save member data')
      return
    }
    
    // Debug logging - Form data
    console.log('Form data being submitted:', formData);
    console.log('Is editing mode:', !!editingMember);
    if (editingMember) {
      console.log('Editing member:', editingMember);
    }
    
    try {
      if (editingMember) {
        // Update existing member
        console.log('Attempting to update member with ID:', editingMember.id);
        const updateData = {
          ...formData,
          updated_at: new Date().toISOString()
        };
        console.log('Update data:', updateData);
        
        const { data, error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', editingMember.id)
          .select();

        console.log('Update response data:', data);
        console.log('Update response error:', error);
        
        if (error) {
          console.error('Supabase update error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('Member updated successfully');
        toast.success('Member updated successfully');
      } else {
        // Create new member
        console.log('Attempting to create new member');
        console.log('Insert data:', formData);
        
        const { data, error } = await supabase
          .from('members')
          .insert([formData])
          .select();

        console.log('Insert response data:', data);
        console.log('Insert response error:', error);
        
        if (error) {
          console.error('Supabase insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('Member added successfully');
        toast.success('Member added successfully');
      }

      setIsDialogOpen(false);
      setEditingMember(null);
      setFormData({
        name: '',
        phone: '',
        fellowship_name: '',
        job: '',
        location: ''
      });
      fetchMembers();
      console.log('=== MEMBER SAVE DEBUG END (SUCCESS) ===');
    } catch (error) {
      console.error('=== MEMBER SAVE ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== MEMBER SAVE DEBUG END (ERROR) ===');
      toast.error('Failed to save member');
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      fellowship_name: member.fellowship_name || '',
      job: member.job || '',
      location: member.location || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    // Debug logging - Authentication status
    console.log('=== MEMBER DELETE DEBUG START ===');
    console.log('User authenticated:', !!user);
    console.log('User details:', user);
    console.log('Session exists:', !!session);
    console.log('Session details:', session);
    console.log('Member ID to delete:', id);
    
    // Check current session before proceeding
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session check:', currentSession)
    console.log('Session check error:', sessionError)
    
    if (!currentSession) {
      console.error('No active session found during delete operation')
      toast.error('Please log in to delete member data')
      return
    }

    try {
      console.log('Attempting to delete member with ID:', id);
      
      const { data, error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)
        .select();

      console.log('Delete response data:', data);
      console.log('Delete response error:', error);
      
      if (error) {
        console.error('Supabase delete error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Member deleted successfully');
      toast.success('Member deleted successfully');
      fetchMembers();
      console.log('=== MEMBER DELETE DEBUG END (SUCCESS) ===');
    } catch (error) {
      console.error('=== MEMBER DELETE ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== MEMBER DELETE DEBUG END (ERROR) ===');
      toast.error('Failed to delete member');
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.fellowship_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.job?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      phone: '',
      fellowship_name: '',
      job: '',
      location: ''
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/20 bg-white/10 backdrop-blur-xl"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-32 w-32 border-t-2 border-blue-400" style={{animationDelay: '0.1s'}}></div>
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-white animate-spin" style={{animationDelay: '0.2s'}} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Members Management
          </h1>
          <p className="text-white/70">
            Manage brothers and sisters database with personal information
          </p>
        </div>
        <Button 
          onClick={openAddDialog}
          className="glass-button hover:scale-105 transition-all duration-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
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
                <TableHead className="text-white/80">Actions</TableHead>
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
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(member)}
                        className="glass-button-outline hover:scale-105 transition-all duration-300"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        className="glass-button-outline hover:scale-105 transition-all duration-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
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
              >
                {editingMember ? 'Update' : 'Add'} Member
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}