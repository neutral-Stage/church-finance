// Complex interactive page - keeping as client component for now
// Can be optimized later with more detailed server-side data fetching
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassButton } from '@/components/ui/glass-button'
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
    try {
      setLoading(true)

      // Fetch advances
      const { data: advancesData, error: advancesError } = await supabase
        .from('advances')
        .select('*')
        .order('created_at', { ascending: false })

      if (advancesError) throw advancesError

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!advanceForm.recipient_name || !advanceForm.amount || !advanceForm.purpose || !advanceForm.fund_id || !advanceForm.expected_return_date) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(advanceForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    // Check if fund has sufficient balance
    const selectedFund = funds.find(f => f.id === advanceForm.fund_id)
    if (!selectedFund || selectedFund.current_balance < amount) {
      toast.error('Insufficient balance in selected fund')
      return
    }

    try {
      const advanceData = {
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
        approved_by: user?.email || 'Unknown'
      }

      if (editingAdvance) {
        const { error } = await supabase
          .from('advances')
          .update(advanceData)
          .eq('id', editingAdvance.id)

        if (error) throw error
        toast.success('Advance updated successfully')
      } else {
        const { error } = await supabase
          .from('advances')
          .insert([advanceData])

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

    const remainingAmount = selectedAdvanceForRepayment.amount - selectedAdvanceForRepayment.amount_returned
    if (repaymentAmount > remainingAmount) {
      toast.error(`Repayment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`)
      return
    }

    try {
      const newAmountReturned = selectedAdvanceForRepayment.amount_returned + repaymentAmount
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
          created_by: user?.id
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
  const totalRepaid = advances.reduce((sum, advance) => sum + advance.amount_returned, 0)
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
    <div className="min-h-screen relative overflow-hidden ">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-indigo-400/25 to-purple-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in animate-slide-in-from-top-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-white" />
              Advances
            </h1>
            <p className="text-white/60">Track advance payments and repayments</p>
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
                  <DialogTitle className="text-white">{editingAdvance ? 'Edit Advance' : 'New Advance'}</DialogTitle>
                  <DialogDescription className="text-white/70">
                    {editingAdvance ? 'Update advance information' : 'Create a new advance payment'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient" className="text-white/90">Recipient *</Label>
                      <Input
                        id="recipient"
                        value={advanceForm.recipient_name}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, recipient_name: e.target.value })}
                        placeholder="Recipient name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-white/90">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={advanceForm.amount}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-white/90">Purpose *</Label>
                    <Textarea
                      id="purpose"
                      value={advanceForm.purpose}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, purpose: e.target.value })}
                      placeholder="What is this advance for?"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fund_id" className="text-white/90">Fund *</Label>
                      <Select value={advanceForm.fund_id} onValueChange={(value) => setAdvanceForm({ ...advanceForm, fund_id: value })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                          <SelectValue placeholder="Select fund" className="text-white/50" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/10 backdrop-blur-xl border-white/20">
                          {funds.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id} className="text-white/90 hover:bg-white/10">
                              {fund.name} ({formatCurrency(fund.current_balance)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expected_return_date" className="text-white/90">Expected Return Date *</Label>
                      <Input
                        id="expected_return_date"
                        type="date"
                        value={advanceForm.expected_return_date}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, expected_return_date: e.target.value })}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-white/90">Status</Label>
                    <Select value={advanceForm.status} onValueChange={(value) => setAdvanceForm({ ...advanceForm, status: value as 'outstanding' | 'partial' | 'returned' })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/10 backdrop-blur-xl border-white/20">
                        <SelectItem value="outstanding" className="text-white/90 hover:bg-white/10">Outstanding</SelectItem>
                        <SelectItem value="partial" className="text-white/90 hover:bg-white/10">Partial</SelectItem>
                        <SelectItem value="returned" className="text-white/90 hover:bg-white/10">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-white/90">Notes</Label>
                    <Textarea
                      id="notes"
                      value={advanceForm.notes}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                      placeholder="Additional notes or conditions"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAdvanceDialogOpen(false)} className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0">
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
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total Outstanding</CardTitle>
              <div className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg">
                <DollarSign className="h-4 w-4 text-red-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                <AnimatedCounter
                  value={totalOutstanding}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
              <p className="text-xs text-white/60">
                {formatCurrency(totalAdvances)} total advances
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total Repaid</CardTitle>
              <div className="p-2 bg-green-500/20 backdrop-blur-sm rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">
                <AnimatedCounter
                  value={totalRepaid}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
              <p className="text-xs text-white/60">
                <AnimatedCounter
                  value={totalAdvances > 0 ? Math.round((totalRepaid / totalAdvances) * 100) : 0}
                  formatter={(v) => `${Math.round(v)}%`}
                /> repayment rate
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Outstanding</CardTitle>
              <div className="p-2 bg-yellow-500/20 backdrop-blur-sm rounded-lg">
                <Users className="h-4 w-4 text-yellow-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                <AnimatedCounter value={outstandingAdvances} />
              </div>
              <p className="text-xs text-white/60">
                Outstanding advances
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Overdue</CardTitle>
              <div className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">
                <AnimatedCounter value={overdueAdvances.length} />
              </div>
              <p className="text-xs text-white/60">
                <AnimatedCounter
                  value={overdueAdvances.reduce((sum, a) => sum + (a.amount - a.amount_returned), 0)}
                  formatter={(v) => formatCurrency(v)}
                /> overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Advances Table */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Advance Records
            </CardTitle>
            <CardDescription className="text-white/60">Track all advance payments and their repayment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/5">
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Recipient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Purpose</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Repaid</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Balance</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Return Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.map((advance) => {
                      const returnDate = new Date(advance.expected_return_date)
                      const isOverdue = advance.status !== 'returned' && returnDate < new Date()
                      const remainingBalance = advance.amount - advance.amount_returned

                      return (
                        <tr key={advance.id} className={`border-b border-white/10 hover:bg-white/5 transition-colors ${isOverdue ? 'bg-red-500/10' : ''}`}>
                          <td className="p-4 text-white/90">{new Date(advance.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-medium text-white/90">{advance.recipient_name}</td>
                          <td className="p-4 max-w-xs truncate text-white/90">{advance.purpose}</td>
                          <td className="p-4 font-medium text-white/90">{formatCurrency(advance.amount)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-green-400" />
                              <span className="text-green-300 font-medium">{formatCurrency(advance.amount_returned)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-red-400" />
                              <span className={`font-medium ${remainingBalance > 0 ? 'text-red-300' : 'text-green-300'}`}>
                                {formatCurrency(remainingBalance)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={isOverdue ? 'text-red-300 font-medium' : 'text-white/90'}>
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
                              className={`${isOverdue ? 'bg-red-500/20 text-red-300 border-red-500/30' : advance.status === 'returned' ? 'bg-green-500/20 text-green-300 border-green-500/30' : advance.status === 'partial' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'} backdrop-blur-sm`}
                            >
                              {isOverdue && advance.status !== 'returned' ? 'overdue' : advance.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {(hasRole('admin') || hasRole('treasurer')) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <GlassButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </GlassButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/10 backdrop-blur-xl border-white/20">
                                  <DropdownMenuItem onClick={() => openAdvanceDialog(advance)} className="text-white/90 hover:bg-white/10">
                                    Edit
                                  </DropdownMenuItem>
                                  {advance.status === 'outstanding' || advance.status === 'partial' ? (
                                    <DropdownMenuItem onClick={() => openRepaymentDialog(advance)} className="text-white/90 hover:bg-white/10">
                                      Record Repayment
                                    </DropdownMenuItem>
                                  ) : null}

                                  <DropdownMenuItem
                                    onClick={() => deleteAdvance(advance.id)}
                                    className="text-red-300 hover:bg-red-500/10"
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
                <div className="text-center py-8 text-white/60">
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
              <DialogTitle className="text-white">Confirm Repayment</DialogTitle>
              <DialogDescription className="text-white/70">
                Are you sure you want to mark this advance as repaid?
              </DialogDescription>
            </DialogHeader>
            {selectedAdvanceForRepayment && (
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Original Amount:</span>
                    <span className="font-medium text-white/90">{formatCurrency(selectedAdvanceForRepayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Already Repaid:</span>
                    <span className="font-medium text-green-300">{formatCurrency(selectedAdvanceForRepayment.amount_returned)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/20 pt-2">
                    <span className="text-sm font-medium text-white/90">Remaining Balance:</span>
                    <span className="font-bold text-white">{formatCurrency(selectedAdvanceForRepayment.amount - selectedAdvanceForRepayment.amount_returned)}</span>
                  </div>
                </div>

                <form onSubmit={handleRepaymentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="repayment_amount" className="text-white/90">Repayment Amount *</Label>
                    <Input
                      id="repayment_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedAdvanceForRepayment.amount - selectedAdvanceForRepayment.amount_returned}
                      value={repaymentForm.amount}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                      placeholder="Enter repayment amount"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method" className="text-white/90">Payment Method *</Label>
                    <Select
                      value={repaymentForm.payment_method}
                      onValueChange={(value: 'cash' | 'bank') => setRepaymentForm({ ...repaymentForm, payment_method: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-white/40">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/10 backdrop-blur-xl border-white/20">
                        <SelectItem value="cash" className="text-white/90 hover:bg-white/10">Cash</SelectItem>
                        <SelectItem value="bank" className="text-white/90 hover:bg-white/10">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repayment_notes" className="text-white/90">Notes</Label>
                    <Textarea
                      id="repayment_notes"
                      value={repaymentForm.notes}
                      onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                      placeholder="Additional notes about this repayment"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRepaymentDialogOpen(false)} className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0">
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