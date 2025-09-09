'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Filter
} from 'lucide-react'
import { Fund, TransactionWithFund, TransactionInsert } from '@/types/database'
import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils'
import { toast } from 'sonner'
import type { TransactionsData } from '@/lib/server-data'

interface TransactionFormData {
  type: 'income' | 'expense'
  fund_id: string
  amount: string
  description: string
  category: string
  payment_method: 'cash' | 'bank'
  transaction_date: string
  receipt_number?: string
}

const TRANSACTION_CATEGORIES = {
  income: [
    'Tithes',
    'Offerings',
    'Donations',
    'Fundraising',
    'Investment Income',
    'Rental Income',
    'Other Income'
  ],
  expense: [
    'Utilities',
    'Maintenance',
    'Supplies',
    'Equipment',
    'Ministry Expenses',
    'Staff Expenses',
    'Insurance',
    'Professional Services',
    'Other Expenses'
  ]
}

interface TransactionsClientProps {
  initialData: TransactionsData
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canApprove: boolean
    userRole: string | null
  }
}

export function TransactionsClient({ initialData, permissions }: TransactionsClientProps) {
  const [transactions, setTransactions] = useState<TransactionWithFund[]>(initialData.transactions)
  const [funds] = useState<Fund[]>(initialData.funds) // Funds rarely change, so no real-time needed
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterFund, setFilterFund] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithFund | null>(null)
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'income',
    fund_id: funds.length > 0 ? funds[0].id : '',
    amount: '',
    description: '',
    category: '',
    payment_method: 'cash',
    transaction_date: formatDateForInput(new Date()),
    receipt_number: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        fund:funds(*)
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }
    setTransactions(data || [])
  }, [])

  // Set up real-time subscription only for updates
  useEffect(() => {
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchTransactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permissions.canEdit) {
      toast.error('You do not have permission to add transactions')
      return
    }

    try {
      setSubmitting(true)
      
      const transactionData: TransactionInsert = {
        type: formData.type,
        fund_id: formData.fund_id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        payment_method: formData.payment_method,
        transaction_date: formData.transaction_date,
        receipt_number: formData.receipt_number || null
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)

        if (error) throw error
        toast.success('Transaction updated successfully')
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData])

        if (error) throw error
        toast.success('Transaction added successfully')
      }

      resetForm()
      setIsDialogOpen(false)
      setEditingTransaction(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (transaction: TransactionWithFund) => {
    if (!permissions.canEdit) {
      toast.error('You do not have permission to edit transactions')
      return
    }

    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      fund_id: transaction.fund_id,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.payment_method,
      transaction_date: transaction.transaction_date,
      receipt_number: transaction.receipt_number || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (transaction: TransactionWithFund) => {
    if (!permissions.canDelete) {
      toast.error('You do not have permission to delete transactions')
      return
    }

    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error
      toast.success('Transaction deleted successfully')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'income',
      fund_id: funds.length > 0 ? funds[0].id : '',
      amount: '',
      description: '',
      category: '',
      payment_method: 'cash',
      transaction_date: formatDateForInput(new Date()),
      receipt_number: ''
    })
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.receipt_number && transaction.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'all' || transaction.type === filterType
    const matchesFund = filterFund === 'all' || transaction.fund_id === filterFund
    
    return matchesSearch && matchesType && matchesFund
  })

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Animated Counter Component
  const AnimatedCounter = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
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
      if (isVisible) {
        const duration = 2000
        const steps = 60
        const stepDuration = duration / steps

        let currentStep = 0
        const timer = setInterval(() => {
          currentStep++
          const easeOutQuart = 1 - Math.pow(1 - currentStep / steps, 4)
          setCount(Math.round(value * easeOutQuart))

          if (currentStep >= steps) {
            setCount(value)
            clearInterval(timer)
          }
        }, stepDuration)

        return () => clearInterval(timer)
      }
    }, [isVisible, value])

    return (
      <div ref={counterRef} className="text-2xl font-bold">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading transactions: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>
      
      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.1s'}}>
          <div className="animate-slide-in-left">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Income &amp; Expenses
            </h1>
            <p className="text-white/70 mt-2">
              Manage all financial transactions with modern insights
            </p>
          </div>
        
          {permissions.canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <GlassButton 
                  onClick={resetForm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </GlassButton>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">
                  {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  {editingTransaction ? 'Update the transaction details below.' : 'Enter the transaction details below.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-white">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') => {
                        setFormData(prev => ({ ...prev, type: value, category: '' }))
                      }}
                    >
                      <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fund_id" className="text-white">Fund</Label>
                    <Select
                      value={formData.fund_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fund_id: value }))}
                    >
                      <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                        <SelectValue placeholder="Select fund" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
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
                    <Label htmlFor="amount" className="text-white">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-white">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
                        {TRANSACTION_CATEGORIES[formData.type].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Input
                    id="description"
                    placeholder="Transaction description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_method" className="text-white">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: 'cash' | 'bank') => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_date" className="text-white">Date</Label>
                    <Input
                      id="transaction_date"
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receipt_number" className="text-white">Receipt Number</Label>
                    <Input
                      id="receipt_number"
                      placeholder="Receipt number (optional)"
                      value={formData.receipt_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <GlassButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingTransaction(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingTransaction ? 'Update' : 'Add'} Transaction
                  </GlassButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.2s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Income</CardTitle>
            <div className="p-2 rounded-full bg-green-500/20 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-green-400">
              <AnimatedCounter value={totalIncome} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {filteredTransactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>
        
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.3s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Expenses</CardTitle>
            <div className="p-2 rounded-full bg-red-500/20 backdrop-blur-sm">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-red-400">
              <AnimatedCounter value={totalExpenses} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {filteredTransactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>
        
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.4s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Net Income</CardTitle>
            <div className={`p-2 rounded-full backdrop-blur-sm ${
              (totalIncome - totalExpenses) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <DollarSign className={`h-4 w-4 ${
                (totalIncome - totalExpenses) >= 0 ? 'text-green-400' : 'text-red-400'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`${
              (totalIncome - totalExpenses) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              <AnimatedCounter value={totalIncome - totalExpenses} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {filteredTransactions.length} total transactions
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Transactions Table */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.5s'}}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
              <Filter className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Transaction History</CardTitle>
              <CardDescription className="text-white/70">
                View and manage all financial transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
              <SelectTrigger className="w-[140px] bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterFund} onValueChange={setFilterFund}>
              <SelectTrigger className="w-[160px] bg-white/10 backdrop-blur-xl border border-white/20 text-white focus:border-white/40 focus:ring-1 focus:ring-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20">
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/80">Date</TableHead>
                  <TableHead className="text-white/80">Description</TableHead>
                  <TableHead className="text-white/80">Category</TableHead>
                  <TableHead className="text-white/80">Fund</TableHead>
                  <TableHead className="text-white/80">Type</TableHead>
                  <TableHead className="text-right text-white/80">Amount</TableHead>
                  <TableHead className="text-white/80">Receipt Number</TableHead>
                  {(permissions.canEdit || permissions.canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction.id} 
                    className="border-white/10 hover:bg-white/5 transition-all duration-200 animate-fade-in"
                    style={{animationDelay: `${0.1 * index}s`}}
                  >
                    <TableCell className="text-white/90">{formatDate(transaction.transaction_date)}</TableCell>
                    <TableCell className="font-medium text-white">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-white/80">{transaction.category}</TableCell>
                    <TableCell className="text-white/80">{transaction.fund?.name}</TableCell>
                    <TableCell>
                      <Badge 
                      variant={transaction.type === 'income' ? 'default' : 'secondary'}
                      className={`bg-white/10 backdrop-blur-xl border ${
                        transaction.type === 'income' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-white/60">
                      {transaction.receipt_number || '-'}
                    </TableCell>
                    {(permissions.canEdit || permissions.canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <GlassButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </GlassButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-black/80 backdrop-blur-xl border border-white/20">
                            <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {permissions.canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(transaction)} className="text-white hover:bg-white/10">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {permissions.canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(transaction)}
                                className="text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-white/5 backdrop-blur-sm w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/60 text-lg">No transactions found</p>
                <p className="text-white/40 text-sm mt-1">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}