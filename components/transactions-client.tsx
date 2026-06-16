'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  Filter,
  Upload,
} from 'lucide-react'
import { Fund, TransactionWithFund } from '@/types/database'
import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils'
import { toast } from 'sonner'
import type { TransactionsData } from '@/lib/server-data'
import { useChurchApi } from '@/contexts/ChurchContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportDialog } from '@/components/import-dialog'
import { ReconciliationPanel } from '@/components/reconciliation-panel'

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
  const { api, hasChurchSelected, selectedChurch } = useChurchApi()
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
  const [activeTab, setActiveTab] = useState<'ledger' | 'reconciliation'>('ledger')
  const [importOpen, setImportOpen] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!hasChurchSelected) {
      setError('Please select a church to view transactions')
      return
    }

    try {
      const response = await api.get('/api/transactions')

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions')
      }

      setTransactions(response.data.transactions || [])
      setError('') // Clear any previous errors
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions'
      setError(errorMessage)
    }
  }, [api, hasChurchSelected])


  // Set up periodic refresh since we're not using realtime subscriptions
  useEffect(() => {
    const interval = setInterval(fetchTransactions, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [fetchTransactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!permissions.canEdit) {
      toast.error('You do not have permission to add transactions')
      return
    }

    if (!hasChurchSelected) {
      toast.error('Please select a church first')
      return
    }

    try {
      setSubmitting(true)
      
      const transactionData = {
        type: formData.type,
        fund_id: formData.fund_id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        payment_method: formData.payment_method,
        transaction_date: formData.transaction_date,
        receipt_number: formData.receipt_number || null,
        church_id: selectedChurch?.id
      }

      let response
      if (editingTransaction) {
        response = await api.put(`/api/transactions/${editingTransaction.id}`, transactionData)
      } else {
        response = await api.post('/api/transactions', transactionData)
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to save transaction')
      }

      toast.success(editingTransaction ? 'Transaction updated successfully' : 'Transaction added successfully')
      resetForm()
      setIsDialogOpen(false)
      setEditingTransaction(null)
      fetchTransactions() // Refresh the list
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
      type: transaction.type as 'income' | 'expense',
      fund_id: transaction.fund_id,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.payment_method as 'cash' | 'bank',
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
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete transaction')
      }

      toast.success('Transaction deleted successfully')
      fetchTransactions() // Refresh the list
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.1s'}}>
          <div className="animate-slide-in-left">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Income &amp; Expenses
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all financial transactions with modern insights
            </p>
          </div>
        
          {permissions.canEdit && (
            <div className="flex gap-2">
              <GlassButton variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </GlassButton>
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
                <DialogTitle className="text-xl">
                  {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction ? 'Update the transaction details below.' : 'Enter the transaction details below.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') => {
                        setFormData(prev => ({ ...prev, type: value, category: '' }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fund_id">Fund</Label>
                    <Select
                      value={formData.fund_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fund_id: value }))}
                    >
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
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Transaction description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: 'cash' | 'bank') => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_date">Date</Label>
                    <Input
                      id="transaction_date"
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receipt_number">Receipt Number</Label>
                    <Input
                      id="receipt_number"
                      placeholder="Receipt number (optional)"
                      value={formData.receipt_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
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
            </div>
        )}
      </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ledger' | 'reconciliation')}>
          <TabsList className="bg-muted">
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="reconciliation" className="mt-6">
            {selectedChurch?.id && (
              <ReconciliationPanel
                churchId={selectedChurch.id}
                funds={funds}
                onReconciled={fetchTransactions}
              />
            )}
          </TabsContent>

          <TabsContent value="ledger" className="mt-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.2s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <div className="p-2 rounded-full bg-income/15">
              <TrendingUp className="h-4 w-4 text-income" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-income">
              <AnimatedCounter value={totalIncome} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTransactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>
        
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.3s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <div className="p-2 rounded-full bg-expense/15">
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-expense">
              <AnimatedCounter value={totalExpenses} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTransactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>
        
          <Card className="hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.4s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <div className={`p-2 rounded-full ${
              (totalIncome - totalExpenses) >= 0 ? 'bg-income/15' : 'bg-expense/15'
            }`}>
              <DollarSign className={`h-4 w-4 ${
                (totalIncome - totalExpenses) >= 0 ? 'text-income' : 'text-expense'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`${
              (totalIncome - totalExpenses) >= 0 ? 'text-income' : 'text-expense'
            }`}>
              <AnimatedCounter value={totalIncome - totalExpenses} prefix={formatCurrency(0).slice(0, 1)} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTransactions.length} total transactions
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Transactions Table */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.5s'}}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/15">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and manage all financial transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterFund} onValueChange={setFilterFund}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt Number</TableHead>
                  {(permissions.canEdit || permissions.canDelete) && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction.id} 
                    className="hover:bg-muted/50 transition-all duration-200 animate-fade-in"
                    style={{animationDelay: `${0.1 * index}s`}}
                  >
                    <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{transaction.category}</TableCell>
                    <TableCell className="text-muted-foreground">{transaction.fund?.name}</TableCell>
                    <TableCell>
                      <Badge 
                      variant={transaction.type === 'income' ? 'default' : 'secondary'}
                      className={`border ${
                        transaction.type === 'income' 
                          ? 'bg-income/15 text-income border-income/30' 
                          : 'bg-expense/15 text-expense border-expense/30'
                      }`}
                    >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'income' ? 'text-income' : 'text-expense'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.receipt_number || '-'}
                    </TableCell>
                    {(permissions.canEdit || permissions.canDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <GlassButton variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Transaction actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </GlassButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {permissions.canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {permissions.canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(transaction)}
                                className="text-destructive focus:text-destructive"
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
                <div className="p-4 rounded-full bg-muted w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">No transactions found</p>
                <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
          </TabsContent>
        </Tabs>

        {selectedChurch?.id && (
          <ImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            importType="transactions"
            churchId={selectedChurch.id}
            onSuccess={() => {
              fetchTransactions()
              setActiveTab('reconciliation')
            }}
          />
        )}
      </div>
    </div>
  )
}