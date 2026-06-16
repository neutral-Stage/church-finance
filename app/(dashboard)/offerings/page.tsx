// Complex interactive page - keeping as client component for now
// Can be optimized later with more detailed server-side data fetching
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { FullScreenLoader } from '@/components/ui/loader'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils'
import { Plus, MoreHorizontal, Edit, Trash2, Calendar, Users, DollarSign, TrendingUp, Building2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { MobileOfferingMode } from '@/components/offerings/mobile-offering-mode'
import { retrySupabaseQuery, logNetworkError, isNetworkError } from '@/lib/retry-utils'
import type { Database } from '@/types/database'

type Offering = Database['public']['Tables']['offerings']['Row']
type Fund = Database['public']['Tables']['funds']['Row']
type Member = Database['public']['Tables']['members']['Row']

interface OfferingWithFund extends Offering {
  offering_member?: {
    member: Member
  } | null
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
  const { selectedChurch } = useChurch()
  const [offerings, setOfferings] = useState<OfferingWithFund[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterFund, setFilterFund] = useState('all')
  const [sundayModeOpen, setSundayModeOpen] = useState(false)
  const { confirm, ConfirmationDialog } = useConfirmationDialog()

  const [form, setForm] = useState<OfferingForm>({
    service_date: formatDateForInput(new Date()),
    type: '',
    amount: '',
    fund_allocations: {},
    selected_member: '',
    notes: ''
  })

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

  const fetchData = useCallback(async (retryCount = 0) => {
    if (!selectedChurch) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch offerings with member relationships using direct Supabase client
      const { data: offeringsData, error: offeringsError } = await retrySupabaseQuery<OfferingWithFund[]>(
        async () => {
          const result = await supabase
            .from('offerings')
            .select(`
              *,
              offering_member:offering_member(
                member:members(*)
              )
            `)
            .eq('church_id', selectedChurch.id)
            .order('service_date', { ascending: false })
          return { data: result.data, error: result.error }
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryCondition: (error) => isNetworkError(error)
        }
      )

      if (offeringsError) {
        logNetworkError()
        throw offeringsError
      }

      if (!offeringsData) {
        toast.error('Failed to fetch offerings data')
        return
      }

      // Process offerings data - offering_member is a single object from the join
      const processedOfferings = offeringsData?.map((offering: Offering & { offering_member?: { member: Member } | null }) => ({
        ...offering,
        member: offering.offering_member?.member || null
      })) || []

      // Fetch funds for the selected church
      const { data: fundsData, error: fundsError } = await retrySupabaseQuery<Fund[]>(
        async () => {
          const result = await supabase
            .from('funds')
            .select('*')
            .eq('church_id', selectedChurch.id)
            .order('name')
          return { data: result.data, error: result.error }
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryCondition: (error) => isNetworkError(error)
        }
      )

      if (fundsError) {
        logNetworkError()
        throw fundsError
      }

      setOfferings(processedOfferings as Array<Offering & { member: Member | null }>)
      setFunds(fundsData || [])
    } catch (error) {
      // Error handled by toast notification
      if (isNetworkError(error)) {
        toast.error('Network connection failed. Please check your internet connection.', {
          action: {
            label: 'Retry',
            onClick: () => fetchData(retryCount + 1)
          }
        })
      } else {
        toast.error('Failed to load offerings data')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveOfferingFromForm()
  }

  const saveOfferingFromForm = async (override?: {
    service_date: string
    type: string
    amount: number
    selected_member: string
    notes: string
  }) => {
    const payload = override ?? {
      service_date: form.service_date,
      type: form.type,
      amount: parseFloat(form.amount),
      selected_member: form.selected_member,
      notes: form.notes,
    }

    // Validate required fields with specific messages
    if (!payload.service_date) {
      toast.error('Service date is required')
      return
    }

    if (!payload.type) {
      toast.error('Offering type is required')
      return
    }

    if (!payload.amount) {
      toast.error('Amount is required')
      return
    }

    const amount = payload.amount
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive amount')
      return
    }

    if (!payload.selected_member || payload.selected_member === 'none') {
      toast.error('Please select a member for this offering')
      return
    }

    try {
      const fundAllocations = getFundAllocationForOfferingType(payload.type, amount)

      const requestData = {
        service_date: payload.service_date,
        type: payload.type,
        amount: amount,
        fund_allocations: fundAllocations,
        notes: payload.notes || null,
        member_id: payload.selected_member && payload.selected_member !== 'none' ? payload.selected_member : null,
        church_id: selectedChurch?.id
      }

      if (editingOffering) {
        // Get the current offering to calculate fund balance changes
        const oldFundAllocations = editingOffering.fund_allocations as Record<string, number> || {}
        const newFundAllocations = requestData.fund_allocations

        // Update the offering using direct Supabase client
        const { error: offeringError } = await supabase
          .from('offerings')
          .update({
            service_date: requestData.service_date,
            type: requestData.type,
            amount: requestData.amount,
            fund_allocations: requestData.fund_allocations,
            notes: requestData.notes,
            church_id: requestData.church_id
          })
          .eq('id', editingOffering.id)

        if (offeringError) {
          throw new Error(offeringError.message || 'Failed to update offering')
        }

        // Handle member association changes
        const currentMemberId = (editingOffering as OfferingWithFund).offering_member?.member?.id
        const newMemberId = requestData.member_id

        if (currentMemberId !== newMemberId) {
          // Remove old member association if exists
          if (currentMemberId) {
            await supabase
              .from('offering_member')
              .delete()
              .eq('offering_id', editingOffering.id)
          }

          // Add new member association if provided
          if (newMemberId) {
            const { error: memberError } = await supabase
              .from('offering_member')
              .insert({
                offering_id: editingOffering.id,
                member_id: newMemberId
              })

            if (memberError) {
              throw new Error('Failed to associate member with offering')
            }
          }
        }

        // Update fund balances - revert old allocations and apply new ones
        const allFundIds = new Set([...Object.keys(oldFundAllocations), ...Object.keys(newFundAllocations)])
        
        for (const fundId of allFundIds) {
          const oldAmount = oldFundAllocations[fundId] || 0
          const newAmount = newFundAllocations[fundId] || 0
          const difference = newAmount - oldAmount

          if (difference !== 0) {
            // Get current balance and update it
            const { data: fundData, error: fetchError } = await supabase
              .from('funds')
              .select('current_balance')
              .eq('id', fundId)
              .single()

            if (fetchError) {
              throw new Error('Failed to fetch fund balance')
            }

            const newBalance = (fundData.current_balance || 0) + difference
            const { error: fundError } = await supabase
              .from('funds')
              .update({ current_balance: newBalance })
              .eq('id', fundId)

            if (fundError) {
              throw new Error('Failed to update fund balance')
            }
          }
        }

        toast.success('Offering updated successfully')
      } else {
        // Create new offering using direct Supabase client
        const { data: newOffering, error: offeringError } = await supabase
          .from('offerings')
          .insert({
            service_date: requestData.service_date,
            type: requestData.type,
            amount: requestData.amount,
            fund_allocations: requestData.fund_allocations,
            notes: requestData.notes,
            church_id: requestData.church_id
          })
          .select()
          .single()

        if (offeringError) {
          throw new Error(offeringError.message || 'Failed to create offering')
        }

        // Create member association if member is selected
        if (requestData.member_id) {
          const { error: memberError } = await supabase
            .from('offering_member')
            .insert({
              offering_id: newOffering.id,
              member_id: requestData.member_id
            })

          if (memberError) {
            // If member association fails, we should clean up the offering
            await supabase.from('offerings').delete().eq('id', newOffering.id)
            console.error('Member association error:', memberError)

            // Provide specific error messages based on error type
            if (memberError.code === '23503') {
              throw new Error('Selected member is invalid or does not belong to this church. Please select a valid member.')
            } else if (memberError.code === '23505') {
              throw new Error('This offering already has a member assigned. Each offering can only have one member.')
            } else {
              throw new Error('Failed to associate member with offering. Please try again.')
            }
          }
        }

        // Update fund balances
        for (const [fundId, allocationAmount] of Object.entries(requestData.fund_allocations)) {
          if (typeof allocationAmount === 'number' && allocationAmount > 0) {
            // Get current balance and update it
            const { data: fundData, error: fetchError } = await supabase
              .from('funds')
              .select('current_balance')
              .eq('id', fundId)
              .single()

            if (fetchError) {
              throw new Error('Failed to fetch fund balance')
            }

            const newBalance = (fundData.current_balance || 0) + allocationAmount
            const { error: fundError } = await supabase
              .from('funds')
              .update({ current_balance: newBalance })
              .eq('id', fundId)

            if (fundError) {
              // If fund update fails, we should clean up
              await supabase.from('offerings').delete().eq('id', newOffering.id)
              throw new Error('Failed to update fund balance')
            }
          }
        }

        toast.success('Offering recorded successfully')
      }

      setDialogOpen(false)
      setSundayModeOpen(false)
      setEditingOffering(null)
      resetForm()
      fetchData()
    } catch (error) {
      // Error handled by toast notification
      const message = error instanceof Error ? error.message : 'Failed to save offering'
      toast.error(message)
      throw error
    }
  }

  const handleEdit = async (offering: OfferingWithFund) => {
    setEditingOffering(offering)

    // Use already loaded member relationship data with proper null checks
    const selectedMemberId = offering.offering_member?.member?.id || ''

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
    try {
      const confirmResult = await confirm({
        title: 'Delete Offering',
        description: 'Are you sure you want to delete this offering record? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        onConfirm: () => { }
      })

      if (!confirmResult) {
        return
      }

      // Get the offering details first to revert fund balances
      const { data: offering, error: fetchError } = await supabase
        .from('offerings')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !offering) {
        throw new Error('Failed to fetch offering details')
      }

      // Revert fund balances
      const fundAllocations = offering.fund_allocations as Record<string, number> || {}
      for (const [fundId, amount] of Object.entries(fundAllocations)) {
        if (typeof amount === 'number' && amount > 0) {
          // Get current balance and update it
          const { data: fundData, error: fetchError } = await supabase
            .from('funds')
            .select('current_balance')
            .eq('id', fundId)
            .single()

          if (fetchError) {
            throw new Error('Failed to fetch fund balance')
          }

          const newBalance = (fundData.current_balance || 0) - amount
          const { error: fundError } = await supabase
            .from('funds')
            .update({ current_balance: newBalance })
            .eq('id', fundId)

          if (fundError) {
            throw new Error('Failed to revert fund balance')
          }
        }
      }

      // Delete member associations first (due to foreign key constraints)
      await supabase
        .from('offering_member')
        .delete()
        .eq('offering_id', id)

      // Delete the offering
      const { error: deleteError } = await supabase
        .from('offerings')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete offering')
      }

      toast.success('Offering deleted successfully')
      fetchData()
    } catch (error) {
      // Error handled by toast notification
      toast.error(error instanceof Error ? error.message : 'Failed to delete offering')
    }
  }

  const resetForm = () => {
    setForm({
      service_date: formatDateForInput(new Date()),
      type: '',
      amount: '',
      fund_allocations: {},
      selected_member: '',
      notes: ''
    })
    setEditingOffering(null)
  }

  // Handle dialog state changes
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      // Reset form and editing state when dialog closes
      resetForm()
    }
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

  // Calculate summary statistics
  const totalOfferings = filteredOfferings.reduce((sum, offering) => sum + offering.amount, 0)
  const totalContributors = filteredOfferings.reduce((sum, offering) => {
    return sum + (offering.offering_member ? 1 : 0)
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
    return <FullScreenLoader message="Loading offerings..." />
  }

  if (!selectedChurch) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
          <div className="glass-card p-8 text-center max-w-md">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Church Selected</h2>
            <p className="text-muted-foreground">Please select a church from the header to view offerings and tithes.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Offerings & Tithes
            </h1>
            <p className="text-muted-foreground">Track and manage church offerings and tithes</p>
          </div>
          {(hasRole('admin') || hasRole('treasurer')) && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSundayModeOpen(true)} className="gap-2">
                <Smartphone className="h-4 w-4" />
                Sunday Mode
              </Button>
            {hasRole('admin') && (
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingOffering(null); resetForm(); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Offering
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="space-y-3 pb-6">
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    {editingOffering ? 'Edit Offering' : 'Record New Offering'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                    {editingOffering ? 'Update the offering details below.' : 'Record a new offering or tithe with automatic fund allocation.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="service_date" className="font-medium text-sm">
                        Service Date *
                      </Label>
                      <Input
                        id="service_date"
                        type="date"
                        value={form.service_date}
                        onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type" className="font-medium text-sm">
                        Offering Type *
                      </Label>
                      <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select offering type" />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFERING_TYPES.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="font-medium text-sm">
                      Total Amount *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
                      <p className="text-sm text-primary flex items-start gap-2">
                        <span className="mt-0.5">i</span>
                        Fund allocation will be determined automatically based on offering type
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="member" className="font-medium text-sm">
                      Member *
                    </Label>
                    <MemberCombobox
                      value={form.selected_member}
                      onValueChange={selectMember}
                      placeholder="Search and select member..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="font-medium text-sm">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Additional notes about this offering..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="order-1 sm:order-2"
                    >
                      {editingOffering ? 'Update' : 'Record'} Offering
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Offerings</p>
                <p className="text-2xl font-bold text-income">
                  <AnimatedCounter value={totalOfferings} />
                </p>
              </div>
              <div className="p-3 bg-income/15 rounded-xl">
                <DollarSign className="h-8 w-8 text-income" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contributors</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={totalContributors} />
                </p>
              </div>
              <div className="p-3 bg-primary/15 rounded-xl">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Offering</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={averageOffering} />
                </p>
              </div>
              <div className="p-3 bg-purple-500/15 rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={
                    offerings
                      .filter(o => new Date(o.service_date).getMonth() === new Date().getMonth())
                      .reduce((sum, o) => sum + o.amount, 0)
                  } />
                </p>
              </div>
              <div className="p-3 bg-pending/15 rounded-xl">
                <Calendar className="h-8 w-8 text-pending" />
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Offerings by Type
            </h3>
            <div className="space-y-3">
              {Object.entries(offeringsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => (
                  <div key={type} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg hover:bg-accent transition-all duration-300">
                    <span className="text-sm text-muted-foreground">{type}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Fund Allocation
            </h3>
            <div className="space-y-3">
              {Object.entries(offeringsByFund)
                .sort(([, a], [, b]) => b - a)
                .map(([fund, amount]) => (
                  <div key={fund} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg hover:bg-accent transition-all duration-300">
                    <span className="text-sm text-muted-foreground">{fund}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.7s' }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Offering Records
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Service Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Fund</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Notes</th>
                    {hasRole('admin') && (
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredOfferings.map((offering) => (
                    <tr key={offering.id} className="border-b border-border hover:bg-accent transition-colors">
                      <td className="p-4 text-muted-foreground">{formatDate(offering.service_date)}</td>
                      <td className="p-4">
                        <Badge variant="outline">{offering.type}</Badge>
                      </td>
                      <td className="p-4 text-right font-medium text-income">{formatCurrency(offering.amount)}</td>
                      <td className="p-4">
                        {Object.keys(offering.fund_allocations || {}).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries((offering.fund_allocations as Record<string, number>) || {}).map(([fundId, amount]) => {
                              const fund = funds.find(f => f.id === fundId)
                              return fund && typeof amount === 'number' ? (
                                <div key={fundId} className="text-sm text-muted-foreground">
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
                        {(() => {
                          if (offering.offering_member && offering.offering_member.member) {
                            const memberData = offering.offering_member
                            return (
                              <div className="text-sm">
                                <div className="font-medium text-foreground">
                                  {memberData.member.name || 'Unknown Member'}
                                </div>
                                {memberData.member.fellowship_name && (
                                  <div className="text-muted-foreground">{memberData.member.fellowship_name}</div>
                                )}
                              </div>
                            )
                          }
                          return <span className="text-muted-foreground">No Member</span>
                        })()}
                      </td>
                      <td className="p-4 max-w-xs truncate text-muted-foreground">{offering.notes || '-'}</td>
                      {hasRole('admin') && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Offering actions">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(offering)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(offering.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
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
        </div>
      </div>
      <ConfirmationDialog />
      {sundayModeOpen && selectedChurch && (
        <MobileOfferingMode
          churchId={selectedChurch.id}
          onClose={() => setSundayModeOpen(false)}
          onSubmit={saveOfferingFromForm}
        />
      )}
    </div>
  )
}