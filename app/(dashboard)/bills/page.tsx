'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Plus, MoreHorizontal, AlertTriangle, CheckCircle, Clock, Receipt, FileText, CreditCard } from 'lucide-react'
import { FullScreenLoader } from '@/components/ui/loader'
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

export default function BillsPage(): JSX.Element {
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

  // Animated Counter Component
  interface AnimatedCounterProps {
    value: number
    duration?: number
    formatter?: (value: number) => string
  }

  function AnimatedCounter({ value, duration = 2000, formatter = (v) => v.toString() }: AnimatedCounterProps) {
    const [count, setCount] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1 }
      )

      if (ref.current) {
        observer.observe(ref.current)
      }

      return () => observer.disconnect()
    }, [])

    useEffect(() => {
      if (!isVisible) return

      let startTime: number
      const startValue = count
      const endValue = value

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime
        const progress = Math.min((currentTime - startTime) / duration, 1)
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutCubic)
        
        setCount(currentCount)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }, [isVisible, value, duration, count])

    return <span ref={ref} className="text-2xl font-bold">{formatter(count)}</span>
  }

  if (loading) {
    return <FullScreenLoader message="Loading bills and petty cash..." />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        <div className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-12 animate-fade-in animate-slide-in-from-bottom-4 shadow-lg hover:bg-white/15 transition-all duration-500" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent mb-3">
                Bills & Petty Cash
              </h1>
              <p className="text-white/70 text-lg font-medium">
                Manage bills and petty cash requests
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex gap-4">
                {hasRole('Admin') && (
                  <>
                    <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 px-6 py-3 text-base font-semibold" onClick={() => openBillDialog()}>
                          <Plus className="w-5 h-5 mr-2" />
                          Add Bill
                        </Button>
                      </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-white">{editingBill ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
                      <DialogDescription className="text-white/70">
                        {editingBill ? 'Update bill information' : 'Create a new bill or recurring payment'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBillSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor_name" className="text-white">Vendor *</Label>
                          <Input
                            id="vendor_name"
                            value={billForm.vendor_name}
                            onChange={(e) => setBillForm({ ...billForm, vendor_name: e.target.value })}
                            placeholder="Vendor name"
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-white">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={billForm.amount}
                            onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="due_date" className="text-white">Due Date *</Label>
                          <Input
                            id="due_date"
                            type="date"
                            value={billForm.due_date}
                            onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fund_id" className="text-white">Fund *</Label>
                          <Select value={billForm.fund_id} onValueChange={(value) => setBillForm({ ...billForm, fund_id: value })}>
                            <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white">
                              <SelectValue placeholder="Select fund" className="text-white/50" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl">
                              {funds.map((fund) => (
                                <SelectItem key={fund.id} value={fund.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                                  {fund.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-white">Category</Label>
                          <Input
                            id="category"
                            value={billForm.category}
                            onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                            placeholder="e.g., Utilities, Maintenance"
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status" className="text-white">Status</Label>
                          <Select value={billForm.status} onValueChange={(value: 'pending' | 'paid' | 'overdue') => setBillForm({ ...billForm, status: value })}>
                            <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white">
                              <SelectValue className="text-white/50" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl">
                              <SelectItem value="pending" className="text-white hover:bg-white/10 focus:bg-white/10">Pending</SelectItem>
                              <SelectItem value="paid" className="text-white hover:bg-white/10 focus:bg-white/10">Paid</SelectItem>
                              <SelectItem value="overdue" className="text-white hover:bg-white/10 focus:bg-white/10">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="frequency" className="text-white">Frequency</Label>
                        <Select value={billForm.frequency} onValueChange={(value: 'one-time' | 'monthly' | 'quarterly' | 'yearly') => setBillForm({ ...billForm, frequency: value })}>
                          <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white">
                            <SelectValue className="text-white/50" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl">
                            <SelectItem value="one-time" className="text-white hover:bg-white/10 focus:bg-white/10">One-time</SelectItem>
                            <SelectItem value="monthly" className="text-white hover:bg-white/10 focus:bg-white/10">Monthly</SelectItem>
                            <SelectItem value="quarterly" className="text-white hover:bg-white/10 focus:bg-white/10">Quarterly</SelectItem>
                            <SelectItem value="yearly" className="text-white hover:bg-white/10 focus:bg-white/10">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setBillDialogOpen(false)} className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:scale-105 transition-all duration-300">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 hover:scale-105 transition-all duration-300">
                          {editingBill ? 'Update Bill' : 'Create Bill'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                  <Dialog open={pettyCashDialogOpen} onOpenChange={setPettyCashDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 px-6 py-3 text-base font-semibold" onClick={() => openPettyCashDialog()}>
                        <Plus className="w-5 h-5 mr-2" />
                        Petty Cash
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-white">{editingPettyCash ? 'Edit Petty Cash' : 'New Petty Cash Request'}</DialogTitle>
                      <DialogDescription className="text-white/70">
                        {editingPettyCash ? 'Update petty cash information' : 'Create a new petty cash request'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePettyCashSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-white">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={pettyCashForm.amount}
                            onChange={(e) => setPettyCashForm({ ...pettyCashForm, amount: e.target.value })}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transaction_date" className="text-white">Transaction Date *</Label>
                          <Input
                            id="transaction_date"
                            type="date"
                            value={pettyCashForm.transaction_date}
                            onChange={(e) => setPettyCashForm({ ...pettyCashForm, transaction_date: e.target.value })}
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purpose" className="text-white">Purpose *</Label>
                        <Textarea
                          id="purpose"
                          value={pettyCashForm.purpose}
                          onChange={(e) => setPettyCashForm({ ...pettyCashForm, purpose: e.target.value })}
                          placeholder="What is this for?"
                          className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="approved_by" className="text-white">Approved By</Label>
                          <Input
                            id="approved_by"
                            value={pettyCashForm.approved_by}
                            onChange={(e) => setPettyCashForm({ ...pettyCashForm, approved_by: e.target.value })}
                            placeholder="Approver name"
                            className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="receipt_available" className="text-white">Receipt Available</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="receipt_available"
                              checked={pettyCashForm.receipt_available}
                              onChange={(e) => setPettyCashForm({ ...pettyCashForm, receipt_available: e.target.checked })}
                              className="bg-white/10 border border-white/20"
                            />
                            <Label htmlFor="receipt_available" className="text-white">Receipt is available</Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPettyCashDialogOpen(false)} className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:scale-105 transition-all duration-300">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 hover:scale-105 transition-all duration-300">
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Overdue Bills</CardTitle>
              <div className="p-2 bg-red-500/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4 text-red-300" />
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedCounter value={overdueBills.length} />
              <p className="text-xs text-white/60 mt-1">
                {formatCurrency(overdueBills.reduce((sum, bill) => sum + bill.amount, 0))} total
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Pending Bills</CardTitle>
              <div className="p-2 bg-yellow-500/20 rounded-lg backdrop-blur-sm">
                <Clock className="h-4 w-4 text-yellow-300" />
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedCounter value={pendingBills.length} />
              <p className="text-xs text-white/60 mt-1">
                {formatCurrency(totalBillsAmount)} total amount
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Pending Petty Cash</CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                <Receipt className="h-4 w-4 text-blue-300" />
              </div>
            </CardHeader>
            <CardContent>
              <AnimatedCounter value={pendingPettyCash.length} />
              <p className="text-xs text-white/60 mt-1">
                {formatCurrency(pendingPettyCash.reduce((sum, pc) => sum + pc.amount, 0))} requested
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Approved Petty Cash</CardTitle>
              <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm">
                <CheckCircle className="h-4 w-4 text-green-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totalPettyCashAmount)}</div>
              <p className="text-xs text-white/60 mt-1">
                Ready for disbursement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-xl w-fit animate-in fade-in-0 slide-in-from-bottom-4 duration-700 shadow-lg" style={{ animationDelay: '500ms' }}>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'bills'
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
          >
            <FileText className="inline w-4 h-4 mr-2" />
            Bills ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('petty-cash')}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'petty-cash'
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
          >
            <CreditCard className="inline w-4 h-4 mr-2" />
            Petty Cash ({pettyCash.length})
          </button>
        </div>

        {/* Bills Table */}
        {activeTab === 'bills' && (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 shadow-lg hover:bg-white/15 transition-all duration-500" style={{ animationDelay: '600ms' }}>
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-white font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent flex items-center gap-3">
                <FileText className="w-6 h-6" />
                Bills Management
              </CardTitle>
              <CardDescription className="text-white/70 text-base font-medium">Manage bills and recurring payments</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/30 bg-white/10">
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Vendor</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Description</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Amount</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Due Date</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Status</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Recurring</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill, index) => {
                        const overdue = bill.status !== 'paid' && isOverdue(bill.due_date)

                        return (
                          <tr key={bill.id} className="border-b border-white/20 hover:bg-white/10 transition-all duration-300 group animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: `${700 + index * 50}ms` }}>
                            <td className="p-6 font-bold text-white/90 text-base">{bill.vendor_name}</td>
                            <td className="p-6 max-w-xs truncate text-white/80 font-medium">{bill.category || '-'}</td>
                            <td className="p-6 font-bold text-white/90 text-lg">{formatCurrency(bill.amount)}</td>
                            <td className="p-4">
                              <div className={overdue ? 'text-red-400 font-medium' : 'text-white/80'}>
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
                                className={`shadow-lg font-semibold ${bill.status === 'paid' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                  bill.status === 'overdue' || overdue ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                  } backdrop-blur-sm`}
                                >
                                  {overdue && bill.status === 'pending' ? 'overdue' : bill.status}
                                </Badge>
                            </td>
                            <td className="p-4">
                              {bill.frequency !== 'one-time' && (
                                <Badge variant="outline" className="bg-white/10 text-white/80 border-white/30 backdrop-blur-sm">{bill.frequency}</Badge>
                              )}
                            </td>
                            <td className="p-4">
                              {hasRole('Admin') && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white/10 backdrop-blur-xl border-white/20">
                                    <DropdownMenuItem onClick={() => openBillDialog(bill)} className="text-white/90 hover:bg-white/10">
                                      Edit
                                    </DropdownMenuItem>
                                    {bill.status !== 'paid' && (
                                      <DropdownMenuItem onClick={() => updateBillStatus(bill.id, 'paid')} className="text-white/90 hover:bg-white/10">
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    {bill.status === 'paid' && (
                                      <DropdownMenuItem onClick={() => updateBillStatus(bill.id, 'pending')} className="text-white/90 hover:bg-white/10">
                                        Mark as Pending
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => deleteBill(bill.id)}
                                      className="text-red-400 hover:bg-red-500/10"
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
                  <div className="text-center py-12">
                    <div className="bg-white/5 backdrop-blur-xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-white/50" />
                    </div>
                    <p className="text-white/70 text-lg font-medium">No bills found</p>
                    <p className="text-white/50 text-sm mt-2">Create your first bill to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Petty Cash Table */}
         {activeTab === 'petty-cash' && (
           <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 shadow-lg hover:bg-white/15 transition-all duration-500" style={{ animationDelay: '600ms' }}>
             <CardHeader className="pb-6">
               <CardTitle className="text-2xl text-white font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent flex items-center gap-3">
                 <CreditCard className="w-6 h-6" />
                 Petty Cash Management
               </CardTitle>
               <CardDescription className="text-white/70 text-base font-medium">Manage petty cash requests and approvals</CardDescription>
             </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/30 bg-white/10">
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Date</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Recipient</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Description</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Amount</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Status</th>
                        <th className="h-14 px-6 text-left align-middle font-semibold text-white/90 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pettyCash.map((pc, index) => (
                        <tr key={pc.id} className="border-b border-white/20 hover:bg-white/10 transition-all duration-300 group animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: `${700 + index * 50}ms` }}>
                          <td className="p-6 text-white/80 font-medium">{formatDate(pc.created_at)}</td>
                          <td className="p-6 font-bold text-white/90">{pc.approved_by || 'N/A'}</td>
                          <td className="p-6 max-w-xs truncate text-white/80 font-medium">{pc.purpose}</td>
                          <td className="p-6 font-bold text-white/90 text-lg">{formatCurrency(pc.amount)}</td>
                          <td className="p-6">
                            <Badge variant="secondary" className={`shadow-lg font-semibold ${pc.receipt_available ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                              } backdrop-blur-sm`}>
                              {pc.receipt_available ? 'Receipt Available' : 'No Receipt'}
                            </Badge>
                          </td>
                          <td className="p-6">
                            {hasRole('Admin') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/10 backdrop-blur-xl border-white/20">
                                  <DropdownMenuItem onClick={() => openPettyCashDialog(pc)} className="text-white/90 hover:bg-white/10">
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deletePettyCash(pc.id)}
                                    className="text-red-400 hover:bg-red-500/10"
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
                  <div className="text-center py-12">
                    <div className="bg-white/5 backdrop-blur-xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                      <CreditCard className="w-10 h-10 text-white/50" />
                    </div>
                    <p className="text-white/70 text-lg font-medium">No petty cash requests found</p>
                    <p className="text-white/50 text-sm mt-2">Create your first request to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}