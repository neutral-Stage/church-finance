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
import { formatCurrency, formatDate, formatDateForInput, isOverdue } from '@/lib/utils'
import { Plus, MoreHorizontal, AlertTriangle, CheckCircle, Clock, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Bill = Database['public']['Tables']['bills']['Row']
type PettyCash = Database['public']['Tables']['petty_cash']['Row']
type Fund = Database['public']['Tables']['funds']['Row']

interface BillForm {
  vendor_name: string
  amount: string
  due_date: string
  fund_id: string
  category: string
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
  status: 'pending' | 'paid' | 'overdue'
}

interface PettyCashForm {
  amount: string
  purpose: string
  transaction_date: string
  approved_by: string
  receipt_available: boolean
}

export default function BillsPage() {
  const { hasRole } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [pettyCash, setPettyCash] = useState<PettyCash[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bills' | 'petty-cash'>('bills')
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [pettyCashDialogOpen, setPettyCashDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [editingPettyCash, setEditingPettyCash] = useState<PettyCash | null>(null)
  const [billForm, setBillForm] = useState<BillForm>({
    vendor_name: '',
    amount: '',
    due_date: '',
    fund_id: '',
    category: '',
    frequency: 'one-time',
    status: 'pending'
  })
  const [pettyCashForm, setPettyCashForm] = useState<PettyCashForm>({
    amount: '',
    purpose: '',
    transaction_date: new Date().toISOString().split('T')[0],
    approved_by: '',
    receipt_available: false
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .order('due_date', { ascending: true })

      if (billsError) throw billsError

      // Fetch petty cash
      const { data: pettyCashData, error: pettyCashError } = await supabase
        .from('petty_cash')
        .select('*')
        .order('created_at', { ascending: false })

      if (pettyCashError) throw pettyCashError

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      setBills(billsData || [])
      setPettyCash(pettyCashData || [])
      setFunds(fundsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load bills and petty cash data')
    } finally {
      setLoading(false)
    }
  }

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!billForm.vendor_name || !billForm.amount || !billForm.due_date || !billForm.fund_id) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(billForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    try {
      const billData = {
        vendor_name: billForm.vendor_name,
        amount: amount,
        due_date: billForm.due_date,
        fund_id: billForm.fund_id,
        category: billForm.category || 'General',
        frequency: billForm.frequency,
        status: billForm.status
      }

      if (editingBill) {
        const { error } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', editingBill.id)

        if (error) throw error
        toast.success('Bill updated successfully')
      } else {
        const { error } = await supabase
          .from('bills')
          .insert([billData])

        if (error) throw error
        toast.success('Bill created successfully')
      }

      setBillDialogOpen(false)
      resetBillForm()
      fetchData()
    } catch (error) {
      console.error('Error saving bill:', error)
      toast.error('Failed to save bill')
    }
  }

  const handlePettyCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pettyCashForm.amount || !pettyCashForm.purpose || !pettyCashForm.transaction_date || !pettyCashForm.approved_by) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(pettyCashForm.amount)
    if (amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    try {
      const pettyCashData = {
        amount: amount,
        purpose: pettyCashForm.purpose,
        transaction_date: pettyCashForm.transaction_date,
        approved_by: pettyCashForm.approved_by,
        receipt_available: pettyCashForm.receipt_available
      }

      if (editingPettyCash) {
        const { error } = await supabase
          .from('petty_cash')
          .update(pettyCashData)
          .eq('id', editingPettyCash.id)

        if (error) throw error
        toast.success('Petty cash updated successfully')
      } else {
        const { error } = await supabase
          .from('petty_cash')
          .insert([pettyCashData])

        if (error) throw error
        toast.success('Petty cash request created successfully')
      }

      setPettyCashDialogOpen(false)
      resetPettyCashForm()
      fetchData()
    } catch (error) {
      console.error('Error saving petty cash:', error)
      toast.error('Failed to save petty cash request')
    }
  }

  const updateBillStatus = async (billId: string, status: 'pending' | 'paid' | 'overdue') => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status })
        .eq('id', billId)

      if (error) throw error

      toast.success(`Bill marked as ${status}`)
      fetchData()
    } catch (error) {
      console.error('Error updating bill status:', error)
      toast.error('Failed to update bill status')
    }
  }



  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId)

      if (error) throw error

      toast.success('Bill deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill')
    }
  }

  const deletePettyCash = async (pettyCashId: string) => {
    if (!confirm('Are you sure you want to delete this petty cash request?')) return

    try {
      const { error } = await supabase
        .from('petty_cash')
        .delete()
        .eq('id', pettyCashId)

      if (error) throw error

      toast.success('Petty cash request deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting petty cash:', error)
      toast.error('Failed to delete petty cash request')
    }
  }

  const resetBillForm = () => {
    setBillForm({
      vendor_name: '',
      amount: '',
      due_date: '',
      fund_id: '',
      category: '',
      frequency: 'one-time',
      status: 'pending'
    })
    setEditingBill(null)
  }

  const resetPettyCashForm = () => {
    setPettyCashForm({
      amount: '',
      purpose: '',
      transaction_date: new Date().toISOString().split('T')[0],
      approved_by: '',
      receipt_available: false
    })
    setEditingPettyCash(null)
  }

  const openBillDialog = (bill?: Bill) => {
    if (bill) {
      setBillForm({
        vendor_name: bill.vendor_name,
        amount: bill.amount.toString(),
        due_date: formatDateForInput(new Date(bill.due_date)),
        fund_id: bill.fund_id,
        category: bill.category || '',
        frequency: bill.frequency,
        status: bill.status
      })
      setEditingBill(bill)
    } else {
      resetBillForm()
    }
    setBillDialogOpen(true)
  }

  const openPettyCashDialog = (pettyCash?: PettyCash) => {
    if (pettyCash) {
      setPettyCashForm({
        amount: pettyCash.amount.toString(),
        purpose: pettyCash.purpose || '',
        transaction_date: formatDateForInput(new Date(pettyCash.transaction_date)),
        approved_by: pettyCash.approved_by || '',
        receipt_available: pettyCash.receipt_available || false
      })
      setEditingPettyCash(pettyCash)
    } else {
      resetPettyCashForm()
    }
    setPettyCashDialogOpen(true)
  }

  // Calculate statistics
  const overdueBills = bills.filter(bill => bill.status !== 'paid' && isOverdue(bill.due_date))
  const pendingBills = bills.filter(bill => bill.status === 'pending')
  const totalBillsAmount = bills.filter(bill => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0)
  const pendingPettyCash = pettyCash // All petty cash items
  const totalPettyCashAmount = pettyCash.reduce((sum, pc) => sum + pc.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bills and petty cash...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills &amp; Petty Cash</h1>
          <p className="text-muted-foreground">Manage bills, payments, and petty cash requests</p>
        </div>
        <div className="flex gap-2">
          {hasRole('Admin') && (
            <>
              <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => openBillDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingBill ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
                    <DialogDescription>
                      {editingBill ? 'Update bill information' : 'Create a new bill or recurring payment'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBillSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">Vendor *</Label>
                        <Input
                          id="vendor_name"
                          value={billForm.vendor_name}
                          onChange={(e) => setBillForm({ ...billForm, vendor_name: e.target.value })}
                          placeholder="Vendor name"
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
                          value={billForm.amount}
                          onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Due Date *</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={billForm.due_date}
                          onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fund_id">Fund *</Label>
                        <Select value={billForm.fund_id} onValueChange={(value) => setBillForm({ ...billForm, fund_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fund" />
                          </SelectTrigger>
                          <SelectContent>
                            {funds.map((fund) => (
                              <SelectItem key={fund.id} value={fund.id}>
                                {fund.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={billForm.category}
                          onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                          placeholder="e.g., Utilities, Maintenance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={billForm.status} onValueChange={(value: 'pending' | 'paid' | 'overdue') => setBillForm({ ...billForm, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select value={billForm.frequency} onValueChange={(value: 'one-time' | 'monthly' | 'quarterly' | 'yearly') => setBillForm({ ...billForm, frequency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setBillDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingBill ? 'Update Bill' : 'Create Bill'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={pettyCashDialogOpen} onOpenChange={setPettyCashDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openPettyCashDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Petty Cash
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingPettyCash ? 'Edit Petty Cash' : 'New Petty Cash Request'}</DialogTitle>
                    <DialogDescription>
                      {editingPettyCash ? 'Update petty cash information' : 'Create a new petty cash request'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePettyCashSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={pettyCashForm.amount}
                          onChange={(e) => setPettyCashForm({ ...pettyCashForm, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transaction_date">Transaction Date *</Label>
                        <Input
                          id="transaction_date"
                          type="date"
                          value={pettyCashForm.transaction_date}
                          onChange={(e) => setPettyCashForm({ ...pettyCashForm, transaction_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose *</Label>
                      <Textarea
                        id="purpose"
                        value={pettyCashForm.purpose}
                        onChange={(e) => setPettyCashForm({ ...pettyCashForm, purpose: e.target.value })}
                        placeholder="What is this for?"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="approved_by">Approved By</Label>
                        <Input
                          id="approved_by"
                          value={pettyCashForm.approved_by}
                          onChange={(e) => setPettyCashForm({ ...pettyCashForm, approved_by: e.target.value })}
                          placeholder="Approver name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="receipt_available">Receipt Available</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="receipt_available"
                            checked={pettyCashForm.receipt_available}
                            onChange={(e) => setPettyCashForm({ ...pettyCashForm, receipt_available: e.target.checked })}
                          />
                          <Label htmlFor="receipt_available">Receipt is available</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setPettyCashDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingPettyCash ? 'Update Request' : 'Create Request'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueBills.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueBills.reduce((sum, bill) => sum + bill.amount, 0))} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBills.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalBillsAmount)} total amount
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Petty Cash</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPettyCash.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingPettyCash.reduce((sum, pc) => sum + pc.amount, 0))} requested
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Petty Cash</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPettyCashAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Ready for disbursement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bills'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bills ({bills.length})
        </button>
        <button
          onClick={() => setActiveTab('petty-cash')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'petty-cash'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Petty Cash ({pettyCash.length})
        </button>
      </div>

      {/* Bills Table */}
      {activeTab === 'bills' && (
        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>Manage bills and recurring payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Vendor</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Due Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Recurring</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => {
                      const overdue = bill.status !== 'paid' && isOverdue(bill.due_date)
                      
                      return (
                        <tr key={bill.id} className="border-b">
                          <td className="p-4 font-medium">{bill.vendor_name}</td>
                          <td className="p-4 max-w-xs truncate">{bill.category || '-'}</td>
                          <td className="p-4 font-medium">{formatCurrency(bill.amount)}</td>
                          <td className="p-4">
                            <div className={overdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(bill.due_date)}
                              {overdue && <AlertTriangle className="inline w-4 h-4 ml-1" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={
                                bill.status === 'paid' ? 'success' :
                                bill.status === 'overdue' || overdue ? 'destructive' : 'warning'
                              }
                            >
                              {overdue && bill.status === 'pending' ? 'overdue' : bill.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {bill.frequency !== 'one-time' && (
                              <Badge variant="outline">{bill.frequency}</Badge>
                            )}
                          </td>
                          <td className="p-4">
                            {hasRole('Admin') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openBillDialog(bill)}>
                                    Edit
                                  </DropdownMenuItem>
                                  {bill.status !== 'paid' && (
                                    <DropdownMenuItem onClick={() => updateBillStatus(bill.id, 'paid')}>
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                  {bill.status === 'paid' && (
                                    <DropdownMenuItem onClick={() => updateBillStatus(bill.id, 'pending')}>
                                      Mark as Pending
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => deleteBill(bill.id)}
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
              {bills.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No bills found. Create your first bill to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Petty Cash Table */}
      {activeTab === 'petty-cash' && (
        <Card>
          <CardHeader>
            <CardTitle>Petty Cash Requests</CardTitle>
            <CardDescription>Manage petty cash requests and approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Recipient</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pettyCash.map((pc) => (
                      <tr key={pc.id} className="border-b">
                        <td className="p-4">{formatDate(pc.created_at)}</td>
                        <td className="p-4 font-medium">{pc.approved_by || 'N/A'}</td>
                        <td className="p-4 max-w-xs truncate">{pc.purpose}</td>
                        <td className="p-4 font-medium">{formatCurrency(pc.amount)}</td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {pc.receipt_available ? 'Receipt Available' : 'No Receipt'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {hasRole('Admin') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openPettyCashDialog(pc)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deletePettyCash(pc.id)}
                                  className="text-red-600"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pettyCash.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No petty cash requests found. Create your first request to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}