// Complex interactive page - keeping as client component for now
// Can be optimized later with more detailed server-side data fetching
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDateForInput } from '@/lib/utils'
import { Plus, MoreHorizontal, DollarSign, Users, TrendingUp, AlertCircle, TrendingDown, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { FullScreenLoader } from '@/components/ui/loader'
import type { Database } from '@/types/database'

type Advance = Database['public']['Tables']['advances']['Row']
type Fund = Database['public']['Tables']['funds']['Row']

interface AnimatedCounterProps {
  value: number
  duration?: number
  formatter?: (value: number) => string
}

function AnimatedCounter({ value, duration = 2000, formatter = (v) => v.toString() }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (counterRef.current) {
      observer.observe(counterRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const startValue = 0
    const endValue = value

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOutCubic

      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, value, duration])

  return (
    <div ref={counterRef}>
      {formatter(count)}
    </div>
  )
}

interface RepaymentForm {
  amount: string
  notes: string
  payment_method: 'cash' | 'bank'
}

export default function AdvancesPage() {
  const { user, hasRole } = useAuth()
  const { selectedChurch } = useChurch()
  const [advances, setAdvances] = useState<Advance[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false)
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false)
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null)
  const [selectedAdvanceForRepayment, setSelectedAdvanceForRepayment] = useState<Advance | null>(null)
  const [advanceForm, setAdvanceForm] = useState<{
    recipient_name: string
    amount: string
    purpose: string
    fund_id: string
    expected_return_date: string
    status: 'outstanding' | 'partial' | 'returned'
    notes: string
  }>({
    recipient_name: '',
    amount: '',
    purpose: '',
    fund_id: '',
    expected_return_date: '',
    status: 'outstanding',
    notes: ''
  })
  const [repaymentForm, setRepaymentForm] = useState<RepaymentForm>({
    amount: '',
    notes: '',
    payment_method: 'cash'
  })

  const fetchData = useCallback(async () => {
    if (!selectedChurch) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch advances - filter by church_id
      const { data: advancesData, error: advancesError } = await supabase
        .from('advances')
        .select('*')
        .eq('church_id', selectedChurch.id)
        .order('created_at', { ascending: false })

      if (advancesError) throw advancesError

      // Fetch funds - filter by church_id
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .eq('church_id', selectedChurch.id)
        .order('name')

      if (fundsError) throw fundsError

      setAdvances(advancesData || [])
      setFunds(fundsData || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load advances data'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!advanceForm.recipient_name || !advanceForm.amount || !advanceForm.purpose || !advanceForm.fund_id || !advanceForm.expected_return_date) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!selectedChurch) {
      toast.error('Please select a church before creating advances')
      return
    }

    const amount = parseFloat(advanceForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    // Check if fund has sufficient balance
    const selectedFund = funds.find(f => f.id === advanceForm.fund_id)
    if (!selectedFund || (selectedFund.current_balance ?? 0) < amount) {
      toast.error('Insufficient balance in selected fund')
      return
    }

    try {
      if (editingAdvance) {
        // Update operation - only update editable fields
        const updateData = {
          recipient_name: advanceForm.recipient_name,
          amount: amount,
          purpose: advanceForm.purpose,
          fund_id: advanceForm.fund_id,
          expected_return_date: advanceForm.expected_return_date,
          status: advanceForm.status,
          notes: advanceForm.notes
        }

        const { error } = await supabase
          .from('advances')
          .update(updateData)
          .eq('id', editingAdvance.id)

        if (error) throw error
        toast.success('Advance updated successfully')
      } else {
        // Insert operation - include all required fields
        const insertData = {
          recipient_name: advanceForm.recipient_name,
          amount: amount,
          purpose: advanceForm.purpose,
          fund_id: advanceForm.fund_id,
          advance_date: new Date().toISOString().split('T')[0],
          expected_return_date: advanceForm.expected_return_date,
          status: advanceForm.status,
          notes: advanceForm.notes,
          amount_returned: 0,
          payment_method: 'bank',
          approved_by: user?.email || 'Unknown',
          church_id: selectedChurch.id
        }

        const { error } = await supabase
          .from('advances')
          .insert([insertData])

        if (error) throw error
        toast.success('Advance created successfully')
      }

      setAdvanceDialogOpen(false)
      resetAdvanceForm()
      fetchData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save advance'
      toast.error(errorMessage)
    }
  }

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAdvanceForRepayment || !repaymentForm.amount) {
      toast.error('Please enter a repayment amount')
      return
    }

    const repaymentAmount = parseFloat(repaymentForm.amount)
    if (repaymentAmount <= 0) {
      toast.error('Repayment amount must be greater than zero')
      return
    }

    const remainingAmount = selectedAdvanceForRepayment.amount - (selectedAdvanceForRepayment.amount_returned ?? 0)
    if (repaymentAmount > remainingAmount) {
      toast.error(`Repayment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`)
      return
    }

    try {
      const newAmountReturned = (selectedAdvanceForRepayment.amount_returned ?? 0) + repaymentAmount
      const newStatus = newAmountReturned >= selectedAdvanceForRepayment.amount ? 'returned' : 'partial'

      // Update advance with new repayment amount and status
      const { error: updateError } = await supabase
        .from('advances')
        .update({
          amount_returned: newAmountReturned,
          status: newStatus,
          notes: repaymentForm.notes ?
            `${selectedAdvanceForRepayment.notes || ''}\n\nRepayment (${new Date().toISOString().split('T')[0]}): ${repaymentForm.notes}` :
            selectedAdvanceForRepayment.notes
        })
        .eq('id', selectedAdvanceForRepayment.id)

      if (updateError) throw updateError

      // Create a transaction record for the repayment
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          type: 'income',
          category: 'Advance Repayment',
          amount: repaymentAmount,
          description: `Advance repayment from ${selectedAdvanceForRepayment.recipient_name}: ${repaymentForm.notes || 'Partial repayment'}`,
          payment_method: repaymentForm.payment_method,
          fund_id: selectedAdvanceForRepayment.fund_id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
          church_id: selectedChurch?.id
        }])

      if (transactionError) throw transactionError

      toast.success(`Repayment of ${formatCurrency(repaymentAmount)} recorded successfully`)
      setRepaymentDialogOpen(false)
      resetRepaymentForm()
      setSelectedAdvanceForRepayment(null)
      fetchData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process repayment'
      toast.error(errorMessage)
    }
  }



  const deleteAdvance = async (advanceId: string) => {
    if (!confirm('Are you sure you want to delete this advance? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', advanceId)

      if (error) throw error

      toast.success('Advance deleted successfully')
      fetchData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete advance'
      toast.error(errorMessage)
    }
  }

  const resetAdvanceForm = () => {
    setAdvanceForm({
      recipient_name: '',
      amount: '',
      purpose: '',
      fund_id: '',
      expected_return_date: '',
      status: 'outstanding',
      notes: ''
    })
    setEditingAdvance(null)
  }

  const resetRepaymentForm = () => {
    setRepaymentForm({
      amount: '',
      notes: '',
      payment_method: 'cash'
    })
  }

  const openAdvanceDialog = (advance?: Advance) => {
    if (advance) {
      setAdvanceForm({
        recipient_name: advance.recipient_name,
        amount: advance.amount.toString(),
        purpose: advance.purpose,
        fund_id: advance.fund_id,
        expected_return_date: formatDateForInput(new Date(advance.expected_return_date)),
        status: 'outstanding' as const,
        notes: advance.notes || ''
      })
      setEditingAdvance(advance)
    } else {
      resetAdvanceForm()
    }
    setAdvanceDialogOpen(true)
  }

  const openRepaymentDialog = (advance: Advance) => {
    setSelectedAdvanceForRepayment(advance)
    resetRepaymentForm()
    setRepaymentDialogOpen(true)
  }

  // Calculate statistics
  const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0)
  const totalRepaid = advances.reduce((sum, advance) => sum + (advance.amount_returned ?? 0), 0)
  const totalOutstanding = totalAdvances - totalRepaid
  const outstandingAdvances = advances.filter(a => a.status === 'outstanding').length
  const overdueAdvances = advances.filter(a => {
    const returnDate = new Date(a.expected_return_date)
    const today = new Date()
    return a.status !== 'returned' && returnDate < today
  })

  if (loading) {
    return <FullScreenLoader message="Loading advances data..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in animate-slide-in-from-top-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-foreground" />
              Advances
            </h1>
            <p className="text-muted-foreground">Track advance payments and repayments</p>
          </div>
          {hasRole('admin') && (
            <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openAdvanceDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Advance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{editingAdvance ? 'Edit Advance' : 'New Advance'}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {editingAdvance ? 'Update advance information' : 'Create a new advance payment'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Recipient *</Label>
                      <Input
                        id="recipient"
                        value={advanceForm.recipient_name}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, recipient_name: e.target.value })}
                        placeholder="Recipient name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={advanceForm.amount}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose *</Label>
                    <Textarea
                      id="purpose"
                      value={advanceForm.purpose}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, purpose: e.target.value })}
                      placeholder="What is this advance for?"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fund_id">Fund *</Label>
                      <Select value={advanceForm.fund_id} onValueChange={(value) => setAdvanceForm({ ...advanceForm, fund_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fund" />
                        </SelectTrigger>
                        <SelectContent>
                          {funds.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id}>
                              {fund.name} ({formatCurrency(fund.current_balance ?? 0)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expected_return_date">Expected Return Date *</Label>
                      <Input
                        id="expected_return_date"
                        type="date"
                        value={advanceForm.expected_return_date}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, expected_return_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={advanceForm.status} onValueChange={(value) => setAdvanceForm({ ...advanceForm, status: value as 'outstanding' | 'partial' | 'returned' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outstanding">Outstanding</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={advanceForm.notes}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                      placeholder="Additional notes or conditions"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAdvanceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingAdvance ? 'Update Advance' : 'Create Advance'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
              <div className="p-2 bg-destructive/15 rounded-lg">
                <DollarSign className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter
                  value={totalOutstanding}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalAdvances)} total advances
              </p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Repaid</CardTitle>
              <div className="p-2 bg-income/15 rounded-lg">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">
                <AnimatedCounter
                  value={totalRepaid}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <AnimatedCounter
                  value={totalAdvances > 0 ? Math.round((totalRepaid / totalAdvances) * 100) : 0}
                  formatter={(v) => `${Math.round(v)}%`}
                /> repayment rate
              </p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
              <div className="p-2 bg-pending/15 rounded-lg">
                <Users className="h-4 w-4 text-pending" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={outstandingAdvances} />
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding advances
              </p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <div className="p-2 bg-destructive/15 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                <AnimatedCounter value={overdueAdvances.length} />
              </div>
              <p className="text-xs text-muted-foreground">
                <AnimatedCounter
                  value={overdueAdvances.reduce((sum, a) => sum + (a.amount - (a.amount_returned ?? 0)), 0)}
                  formatter={(v) => formatCurrency(v)}
                /> overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Advances Table */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Advance Records
            </CardTitle>
            <CardDescription className="text-muted-foreground">Track all advance payments and their repayment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Recipient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Purpose</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Repaid</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Balance</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Return Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.map((advance) => {
                      const returnDate = new Date(advance.expected_return_date)
                      const isOverdue = advance.status !== 'returned' && returnDate < new Date()
                      const remainingBalance = advance.amount - (advance.amount_returned ?? 0)

                      return (
                        <tr key={advance.id} className={`border-b border-border hover:bg-accent transition-colors ${isOverdue ? 'bg-destructive/10' : ''}`}>
                          <td className="p-4 text-muted-foreground">{advance.created_at ? new Date(advance.created_at).toLocaleDateString() : 'No date'}</td>
                          <td className="p-4 font-medium text-foreground">{advance.recipient_name}</td>
                          <td className="p-4 max-w-xs truncate text-muted-foreground">{advance.purpose}</td>
                          <td className="p-4 text-right font-medium text-foreground">{formatCurrency(advance.amount)}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingDown className="w-3 h-3 text-income" />
                              <span className="text-income font-medium">{formatCurrency(advance.amount_returned ?? 0)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3 text-expense" />
                              <span className={`font-medium ${remainingBalance > 0 ? 'text-expense' : 'text-income'}`}>
                                {formatCurrency(remainingBalance)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                              {returnDate.toLocaleDateString()}
                              {isOverdue && <AlertCircle className="inline w-4 h-4 ml-1" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                advance.status === 'returned' ? 'success' :
                                  isOverdue ? 'destructive' :
                                    advance.status === 'partial' ? 'warning' : 'secondary'
                              }
                              className={`${isOverdue ? 'bg-destructive/15 text-destructive border-destructive/30' : advance.status === 'returned' ? 'bg-income/15 text-income border-income/30' : advance.status === 'partial' ? 'bg-pending/15 text-pending border-pending/30' : 'bg-muted text-muted-foreground border-border'}`}
                            >
                              {isOverdue && advance.status !== 'returned' ? 'overdue' : advance.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {(hasRole('admin') || hasRole('treasurer')) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Advance actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openAdvanceDialog(advance)}>
                                    Edit
                                  </DropdownMenuItem>
                                  {advance.status === 'outstanding' || advance.status === 'partial' ? (
                                    <DropdownMenuItem onClick={() => openRepaymentDialog(advance)}>
                                      Record Repayment
                                    </DropdownMenuItem>
                                  ) : null}

                                  <DropdownMenuItem
                                    onClick={() => deleteAdvance(advance.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {advances.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No advances found. Create your first advance to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Repayment Dialog */}
        <Dialog open={repaymentDialogOpen} onOpenChange={setRepaymentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirm Repayment</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Are you sure you want to mark this advance as repaid?
              </DialogDescription>
            </DialogHeader>
            {selectedAdvanceForRepayment && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Original Amount:</span>
                    <span className="font-medium text-foreground">{formatCurrency(selectedAdvanceForRepayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Already Repaid:</span>
                    <span className="font-medium text-income">{formatCurrency(selectedAdvanceForRepayment.amount_returned ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-sm font-medium text-foreground">Remaining Balance:</span>
                    <span className="font-bold text-foreground">{formatCurrency(selectedAdvanceForRepayment.amount - (selectedAdvanceForRepayment.amount_returned ?? 0))}</span>
                  </div>
                </div>

                <form onSubmit={handleRepaymentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="repayment_amount">Repayment Amount *</Label>
                    <Input
                      id="repayment_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedAdvanceForRepayment.amount - (selectedAdvanceForRepayment.amount_returned ?? 0)}
                      value={repaymentForm.amount}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                      placeholder="Enter repayment amount"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method *</Label>
                    <Select
                      value={repaymentForm.payment_method}
                      onValueChange={(value: 'cash' | 'bank') => setRepaymentForm({ ...repaymentForm, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repayment_notes">Notes</Label>
                    <Textarea
                      id="repayment_notes"
                      value={repaymentForm.notes}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                      placeholder="Additional notes about this repayment"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRepaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Record Repayment
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}