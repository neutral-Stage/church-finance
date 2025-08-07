'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils'
import { Plus, MoreHorizontal, Edit, Trash2, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Offering = Database['public']['Tables']['offerings']['Row']
type OfferingInsert = Database['public']['Tables']['offerings']['Insert']
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
      
      const offeringData: OfferingInsert = {
        service_date: form.service_date,
        type: form.type as any,
        amount: amount,
        fund_allocations: fundAllocations,
        notes: form.notes || null
      }

      let offeringId: string

      if (editingOffering) {
        const { error } = await supabase
          .from('offerings')
          .update(offeringData)
          .eq('id', editingOffering.id)

        if (error) throw error
        offeringId = editingOffering.id

        // Delete existing member relationships
        await supabase
          .from('offering_members')
          .delete()
          .eq('offering_id', offeringId)

        toast.success('Offering updated successfully')
      } else {
        const { data, error } = await supabase
          .from('offerings')
          .insert([offeringData])
          .select()
          .single()

        if (error) throw error
        offeringId = data.id
        toast.success('Offering recorded successfully')
      }

      // Insert member relationship
      if (form.selected_member && form.selected_member !== 'none') {
        const { error: memberError } = await supabase
          .from('offering_members')
          .insert([{
            offering_id: offeringId,
            member_id: form.selected_member
          }])

        if (memberError) throw memberError
      }

      setDialogOpen(false)
      setEditingOffering(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving offering:', error)
      toast.error('Failed to save offering')
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
      const { error } = await supabase
        .from('offerings')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Offering deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting offering:', error)
      toast.error('Failed to delete offering')
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
      selected_member: memberId === 'none' ? '' : memberId
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
        <div className="text-lg">Loading offerings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offerings &amp; Tithes</h1>
          <p className="text-muted-foreground">Track and manage church offerings and tithes</p>
        </div>
        {hasRole('Admin') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingOffering(null); resetForm(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Record Offering
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingOffering ? 'Edit Offering' : 'Record New Offering'}
                </DialogTitle>
                <DialogDescription>
                  {editingOffering ? 'Update the offering details.' : 'Record a new offering or tithe.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_date">Service Date *</Label>
                    <Input
                      id="service_date"
                      type="date"
                      value={form.service_date}
                      onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Offering Type *</Label>
                    <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFERING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Fund allocation will be determined automatically based on offering type
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member">Member</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                    <Select value={form.selected_member} onValueChange={selectMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes about this offering..."
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOffering ? 'Update' : 'Record'} Offering
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offerings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOfferings)}</div>
            <p className="text-xs text-muted-foreground">
              From {filteredOfferings.length} offerings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContributors}</div>
            <p className="text-xs text-muted-foreground">
              Across all offerings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Offering</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageOffering)}</div>
            <p className="text-xs text-muted-foreground">
              Per service
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                offerings
                  .filter(o => new Date(o.service_date).getMonth() === new Date().getMonth())
                  .reduce((sum, o) => sum + o.amount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Offerings by Type</CardTitle>
            <CardDescription>Breakdown of offerings by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(offeringsByType)
                .sort(([,a], [,b]) => b - a)
                .map(([type, amount]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm">{type}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fund Allocation</CardTitle>
            <CardDescription>How offerings are distributed across funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(offeringsByFund)
                .sort(([,a], [,b]) => b - a)
                .map(([fund, amount]) => (
                  <div key={fund} className="flex justify-between items-center">
                    <span className="text-sm">{fund}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Offering Records</CardTitle>
          <CardDescription>View and manage all offering records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Input
              placeholder="Search offerings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {OFFERING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFund} onValueChange={setFilterFund}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="Filter by fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offerings Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Service Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Fund</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Member</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Notes</th>
                    {hasRole('Admin') && (
                      <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredOfferings.map((offering) => (
                    <tr key={offering.id} className="border-b">
                      <td className="p-4">{formatDate(offering.service_date)}</td>
                      <td className="p-4">
                        <Badge variant="outline">{offering.type}</Badge>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(offering.amount)}</td>
                      <td className="p-4">
                        {Object.keys(offering.fund_allocations || {}).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries((offering.fund_allocations as Record<string, number>) || {}).map(([fundId, amount]) => {
                              const fund = funds.find(f => f.id === fundId)
                              return fund && typeof amount === 'number' ? (
                                <div key={fundId} className="text-sm">
                                  {fund.name}: {formatCurrency(amount)}
                                </div>
                              ) : null
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {offering.offering_members && offering.offering_members.length > 0 ? (
                          <div className="text-sm">
                            <div className="font-medium">{offering.offering_members[0].member.name}</div>
                            {offering.offering_members[0].member.fellowship_name && (
                              <div className="text-muted-foreground">{offering.offering_members[0].member.fellowship_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs truncate">{offering.notes || '-'}</td>
                      {hasRole('Admin') && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(offering)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {hasRole('Admin') && (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(offering.id)}
                                  className="text-destructive"
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
              <div className="text-center py-8 text-muted-foreground">
                No offerings found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}