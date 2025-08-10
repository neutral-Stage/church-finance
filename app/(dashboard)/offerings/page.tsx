'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AnimatedCounter } from '@/components/ui/animated-counter'

import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils'
import { Plus, MoreHorizontal, Edit, Trash2, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Offering = Database['public']['Tables']['offerings']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type Member = Database['public']['Tables']['members']['Row']

interface OfferingWithFund extends Offering {
  offering_members?: {
    member: Member
  }[]
}

interface OfferingForm {
  service_date: string
  type: string
  amount: string
  fund_allocations: Record<string, number>
  selected_member: string
  notes: string
}

const OFFERING_TYPES = [
  'Tithe',
  'Lord\'s Day',
  'Other Offering',
  'Special Offering',
  'Mission Fund Offering',
  'Building Fund Offering'
]

export default function OfferingsPage() {
  const { hasRole } = useAuth()
  const [offerings, setOfferings] = useState<OfferingWithFund[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterFund, setFilterFund] = useState('all')
  const [memberSearchTerm, setMemberSearchTerm] = useState('')

  const [form, setForm] = useState<OfferingForm>({
    service_date: formatDateForInput(new Date()),
    type: '',
    amount: '',
    fund_allocations: {},
    selected_member: 'none',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Function to automatically determine fund allocation based on offering type
  const getFundAllocationForOfferingType = (offeringType: string, amount: number): Record<string, number> => {
    const managementFund = funds.find(f => f.name.toLowerCase().includes('management'))
    const missionFund = funds.find(f => f.name.toLowerCase().includes('mission'))
    const buildingFund = funds.find(f => f.name.toLowerCase().includes('building'))
    
    switch (offeringType) {
      case 'Mission Fund Offering':
        return missionFund ? { [missionFund.id]: amount } : {}
      case 'Building Fund Offering':
        return buildingFund ? { [buildingFund.id]: amount } : {}
      default:
        // All other offerings go to Management Fund
        return managementFund ? { [managementFund.id]: amount } : {}
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch offerings with member relationships
      const { data: offeringsData, error: offeringsError } = await supabase
        .from('offerings')
        .select(`
          *,
          offering_members(
            member:members(*)
          )
        `)
        .order('service_date', { ascending: false })

      if (offeringsError) throw offeringsError

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name')

      if (membersError) throw membersError

      setOfferings(offeringsData || [])
      setFunds(fundsData || [])
      setMembers(membersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load offerings data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.service_date || !form.type || !form.amount) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const amount = parseFloat(form.amount)
      const fundAllocations = getFundAllocationForOfferingType(form.type, amount)
      
      const requestData = {
        service_date: form.service_date,
        type: form.type,
        amount: amount,
        fund_allocations: fundAllocations,
        notes: form.notes || null,
        member_id: form.selected_member && form.selected_member !== 'none' ? form.selected_member : null
      }

      if (editingOffering) {
        const response = await fetch('/api/offerings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingOffering.id,
            ...requestData
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update offering')
        }

        toast.success('Offering updated successfully')
      } else {
        const response = await fetch('/api/offerings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create offering')
        }

        toast.success('Offering recorded successfully')
      }

      setDialogOpen(false)
      setEditingOffering(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving offering:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save offering')
    }
  }

  const handleEdit = async (offering: OfferingWithFund) => {
    setEditingOffering(offering)
    
    // Fetch member relationship for this offering
    const { data: memberRelations } = await supabase
      .from('offering_members')
      .select('member_id')
      .eq('offering_id', offering.id)
      .limit(1)
    
    const selectedMemberId = memberRelations?.[0]?.member_id || 'none'
    
    setForm({
      service_date: offering.service_date,
      type: offering.type,
      amount: offering.amount.toString(),
      fund_allocations: {},
      selected_member: selectedMemberId,
      notes: offering.notes || ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offering record?')) return

    try {
      const response = await fetch(`/api/offerings?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete offering')
      }

      toast.success('Offering deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting offering:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete offering')
    }
  }

  const resetForm = () => {
    setForm({
      service_date: formatDateForInput(new Date()),
      type: '',
      amount: '',
      fund_allocations: {},
      selected_member: 'none',
      notes: ''
    })
    setMemberSearchTerm('')
  }

  const filteredOfferings = offerings.filter(offering => {
    const matchesSearch = offering.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offering.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || offering.type === filterType
    const matchesFund = filterFund === 'all' || Object.keys(offering.fund_allocations || {}).includes(filterFund)
    
    return matchesSearch && matchesType && matchesFund
  })

  // Helper function for member selection
  const selectMember = (memberId: string) => {
    setForm(prev => ({
      ...prev,
      selected_member: memberId
    }))
  }

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    if (!memberSearchTerm) return true
    const searchLower = memberSearchTerm.toLowerCase()
    return member.name.toLowerCase().includes(searchLower) ||
           (member.fellowship_name && member.fellowship_name.toLowerCase().includes(searchLower))
  })



  // Calculate summary statistics
  const totalOfferings = filteredOfferings.reduce((sum, offering) => sum + offering.amount, 0)
  const totalContributors = filteredOfferings.reduce((sum, offering) => {
    return sum + (offering.offering_members?.length || 0)
  }, 0)
  const averageOffering = filteredOfferings.length > 0 ? totalOfferings / filteredOfferings.length : 0
  
  // Group by offering type for breakdown
  const offeringsByType = filteredOfferings.reduce((acc, offering) => {
    acc[offering.type] = (acc[offering.type] || 0) + offering.amount
    return acc
  }, {} as Record<string, number>)

  // Group by fund for allocation breakdown
  const offeringsByFund = filteredOfferings.reduce((acc, offering) => {
    Object.entries((offering.fund_allocations as Record<string, number>) || {}).forEach(([fundId, amount]) => {
      const fund = funds.find(f => f.id === fundId)
      if (fund && typeof amount === 'number') {
        acc[fund.name] = (acc[fund.name] || 0) + amount
      }
    })
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{animationDelay: '0.15s'}}></div>
          </div>
          <div className="text-lg text-white/80">Loading offerings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Offerings & Tithes
          </h1>
          <p className="text-white/70">Track and manage church offerings and tithes</p>
        </div>
        {hasRole('Admin') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingOffering(null); resetForm(); }} className="glass-button hover:scale-105 transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Record Offering
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/20">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingOffering ? 'Edit Offering' : 'Record New Offering'}
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  {editingOffering ? 'Update the offering details.' : 'Record a new offering or tithe.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_date" className="text-white/90">Service Date *</Label>
                    <Input
                      id="service_date"
                      type="date"
                      value={form.service_date}
                      onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                      required
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-white/90">Offering Type *</Label>
                    <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="glass-dropdown">
                        {OFFERING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white/90">Total Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="glass-input"
                  />
                  <p className="text-sm text-white/60">
                    Fund allocation will be determined automatically based on offering type
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member" className="text-white/90">Member</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="mb-2 glass-input"
                    />
                    <Select value={form.selected_member} onValueChange={selectMember}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select a member (optional)" />
                      </SelectTrigger>
                      <SelectContent className="glass-dropdown">
                        <SelectItem value="none">No member selected</SelectItem>
                        {filteredMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}{member.fellowship_name ? ` (${member.fellowship_name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-white/90">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes about this offering..."
                    className="glass-input"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="glass-button-outline">
                    Cancel
                  </Button>
                  <Button type="submit" className="glass-button">
                    {editingOffering ? 'Update' : 'Record'} Offering
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Total Offerings</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                <AnimatedCounter value={totalOfferings} />
              </p>
            </div>
            <div className="p-3 bg-green-500/20 backdrop-blur-sm rounded-xl">
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Total Contributors</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                <AnimatedCounter value={totalContributors} />
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">Average Offering</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                <AnimatedCounter value={averageOffering} />
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-xl">
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">This Month</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                <AnimatedCounter value={
                  offerings
                    .filter(o => new Date(o.service_date).getMonth() === new Date().getMonth())
                    .reduce((sum, o) => sum + o.amount, 0)
                } />
              </p>
            </div>
            <div className="p-3 bg-orange-500/20 backdrop-blur-sm rounded-xl">
              <Calendar className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
            Offerings by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(offeringsByType)
              .sort(([,a], [,b]) => b - a)
              .map(([type, amount]) => (
                <div key={type} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300">
                  <span className="text-sm text-white/80">{type}</span>
                  <span className="font-medium text-white">{formatCurrency(amount)}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
            Fund Allocation
          </h3>
          <div className="space-y-3">
            {Object.entries(offeringsByFund)
              .sort(([,a], [,b]) => b - a)
              .map(([fund, amount]) => (
                <div key={fund} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300">
                  <span className="text-sm text-white/80">{fund}</span>
                  <span className="font-medium text-white">{formatCurrency(amount)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.7s' }}>
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
          Offering Records
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search offerings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input sm:max-w-xs"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="glass-input sm:max-w-xs">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="glass-dropdown">
              <SelectItem value="all">All Types</SelectItem>
              {OFFERING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterFund} onValueChange={setFilterFund}>
            <SelectTrigger className="glass-input sm:max-w-xs">
              <SelectValue placeholder="Filter by fund" />
            </SelectTrigger>
            <SelectContent className="glass-dropdown">
              <SelectItem value="all">All Funds</SelectItem>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Offerings Table */}
        <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-white/10">
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Service Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Type</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Amount</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Fund</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Member</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Notes</th>
                  {hasRole('Admin') && (
                    <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredOfferings.map((offering) => (
                  <tr key={offering.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/80">{formatDate(offering.service_date)}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="border-white/30 text-white/90">{offering.type}</Badge>
                    </td>
                    <td className="p-4 font-medium text-white">{formatCurrency(offering.amount)}</td>
                    <td className="p-4">
                      {Object.keys(offering.fund_allocations || {}).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries((offering.fund_allocations as Record<string, number>) || {}).map(([fundId, amount]) => {
                            const fund = funds.find(f => f.id === fundId)
                            return fund && typeof amount === 'number' ? (
                              <div key={fundId} className="text-sm text-white/80">
                                {fund.name}: {formatCurrency(amount)}
                              </div>
                            ) : null
                          })}
                        </div>
                      ) : (
                        <span className="text-white/50">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {offering.offering_members && offering.offering_members.length > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium text-white/90">{offering.offering_members[0].member.name}</div>
                          {offering.offering_members[0].member.fellowship_name && (
                            <div className="text-white/60">{offering.offering_members[0].member.fellowship_name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/50">-</span>
                      )}
                    </td>
                    <td className="p-4 max-w-xs truncate text-white/80">{offering.notes || '-'}</td>
                    {hasRole('Admin') && (
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4 text-white/70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-dropdown">
                            <DropdownMenuItem onClick={() => handleEdit(offering)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {hasRole('Admin') && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(offering.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOfferings.length === 0 && (
            <div className="text-center py-8 text-white/60">
              No offerings found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}