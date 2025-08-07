'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { formatCurrency, formatDateForInput } from '@/lib/utils'
import { Plus, MoreHorizontal, DollarSign, Users, TrendingUp, AlertCircle, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Advance = Database['public']['Tables']['advances']['Row']
type Fund = Database['public']['Tables']['funds']['Row']



interface RepaymentForm {
  amount: string
  notes: string
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
    notes: ''
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
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load advances data')
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
    } catch (error) {
      console.error('Error saving advance:', error)
      toast.error('Failed to save advance')
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
    } catch (error) {
      console.error('Error processing repayment:', error)
      toast.error('Failed to process repayment')
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
    } catch (error) {
      console.error('Error deleting advance:', error)
      toast.error('Failed to delete advance')
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
      notes: ''
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading advances...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advances</h1>
          <p className="text-muted-foreground">Track advance payments and repayments</p>
        </div>
        {hasRole('Admin') && (
          <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openAdvanceDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingAdvance ? 'Edit Advance' : 'New Advance'}</DialogTitle>
                <DialogDescription>
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
                            {fund.name} ({formatCurrency(fund.current_balance)})
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalAdvances)} total advances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repaid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRepaid)}</div>
            <p className="text-xs text-muted-foreground">
              {totalAdvances > 0 ? Math.round((totalRepaid / totalAdvances) * 100) : 0}% repayment rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outstandingAdvances}</div>
            <p className="text-xs text-muted-foreground">
                Outstanding advances
              </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAdvances.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueAdvances.reduce((sum, a) => sum + (a.amount - a.amount_returned), 0))} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Advance Records</CardTitle>
          <CardDescription>Track all advance payments and their repayment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Recipient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Purpose</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Repaid</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Balance</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Return Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((advance) => {
                    const returnDate = new Date(advance.expected_return_date)
                    const isOverdue = advance.status !== 'returned' && returnDate < new Date()
                    const remainingBalance = advance.amount - advance.amount_returned
                    
                    return (
                      <tr key={advance.id} className="border-b">
                        <td className="p-4">{new Date(advance.created_at).toLocaleDateString()}</td>
                        <td className="p-4 font-medium">{advance.recipient_name}</td>
                        <td className="p-4 max-w-xs truncate">{advance.purpose}</td>
                        <td className="p-4 font-medium">{formatCurrency(advance.amount)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-green-500" />
                            <span className="text-green-600 font-medium">{formatCurrency(advance.amount_returned)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-red-500" />
                            <span className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(remainingBalance)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
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
                          >
                            {isOverdue && advance.status !== 'returned' ? 'overdue' : advance.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {(hasRole('Admin') || hasRole('Treasurer')) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
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
                                  className="text-red-600"
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
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Record a repayment for {selectedAdvanceForRepayment?.recipient_name}&apos;s advance
            </DialogDescription>
          </DialogHeader>
          {selectedAdvanceForRepayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Original Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedAdvanceForRepayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Already Repaid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(selectedAdvanceForRepayment.amount_returned)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Remaining Balance:</span>
                  <span className="font-bold">{formatCurrency(selectedAdvanceForRepayment.amount - selectedAdvanceForRepayment.amount_returned)}</span>
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
                    max={selectedAdvanceForRepayment.amount - selectedAdvanceForRepayment.amount_returned}
                    value={repaymentForm.amount}
                    onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                    placeholder="Enter repayment amount"
                    required
                  />
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
  )
}