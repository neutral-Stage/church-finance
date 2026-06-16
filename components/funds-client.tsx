'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { Button } from '@/components/ui/button'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

import { formatDate } from '@/lib/utils'
import { Plus, MoreHorizontal, Edit, Trash2, Banknote, TrendingUp, Eye, DollarSign, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'

import type { Fund, TransactionWithFund } from '@/lib/server-data'
import type { FundsPageData } from '@/lib/server-data'

// Extended fund interface for form data
interface ExtendedFund extends Omit<Fund, 'target_amount' | 'fund_type'> {
  target_amount?: number
  fund_type?: string
}

interface FundForm {
  name: string
  description: string
  target_amount?: number
  fund_type: string
}

interface FundTransferForm {
  from_fund_id: string
  to_fund_id: string
  amount: number
  description: string
}

const FUND_TYPES = [
  'Mission Fund',
  'Building Fund', 
  'Management Fund',
  'Special Fund',
  'Emergency Fund'
]

interface FundsClientProps {
  initialData: FundsPageData
}

export default function FundsClient({ initialData }: FundsClientProps) {
  const { hasRole } = useAuth()
  const { selectedChurch } = useChurch()
  const [funds, setFunds] = useState<Fund[]>(initialData.funds)
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithFund[]>(initialData.recentTransactions)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const { confirm, ConfirmationDialog } = useConfirmationDialog()

  const [form, setForm] = useState<FundForm>({
    name: '',
    description: '',
    target_amount: undefined,
    fund_type: 'Management Fund'
  })

  const [transferForm, setTransferForm] = useState<FundTransferForm>({
    from_fund_id: '',
    to_fund_id: '',
    amount: 0,
    description: ''
  })

  const fetchData = async () => {
    try {
      const [fundsResponse, transactionsResponse] = await Promise.all([
        fetch('/api/funds', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/transactions?limit=20', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ])

      if (!fundsResponse.ok) {
        const errorData = await fundsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch funds')
      }
      
      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch transactions')
      }

      const fundsData = await fundsResponse.json()
      const transactionsData = await transactionsResponse.json()

      setFunds(fundsData.funds || [])
      setRecentTransactions(transactionsData.transactions || [])
    } catch {
      toast.error('Failed to load funds data')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Fund name is required')
      return
    }

    try {
      const requestData = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        target_amount: form.target_amount || null,
        fund_type: form.fund_type
      }

      if (editingFund) {
        const response = await fetch(`/api/funds/${editingFund.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update fund')
        }
        
        toast.success('Fund updated successfully')
      } else {
        const response = await fetch('/api/funds', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...requestData,
            current_balance: 0
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create fund')
        }
        
        toast.success('Fund created successfully')
      }

      setDialogOpen(false)
      setEditingFund(null)
      resetForm()
      fetchData()
    } catch {
      toast.error('Failed to save fund')
    }
  }

  const handleEdit = (fund: Fund) => {
    setEditingFund(fund)
    setForm({
      name: fund.name,
      description: fund.description || '',
      target_amount: (fund as ExtendedFund).target_amount || undefined,
      fund_type: (fund as ExtendedFund).fund_type || 'Management Fund'
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const confirmResult = await confirm({
        title: 'Delete Fund',
        description: 'Are you sure you want to delete this fund? This action cannot be undone and will affect all related transactions.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        onConfirm: () => { }
      })

      if (!confirmResult) return

      const response = await fetch(`/api/funds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete fund')
      }

      toast.success('Fund deleted successfully')
      fetchData()
    } catch {
      toast.error('Failed to delete fund')
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      target_amount: undefined,
      fund_type: 'Management Fund'
    })
    setEditingFund(null)
  }

  const resetTransferForm = () => {
    setTransferForm({
      from_fund_id: '',
      to_fund_id: '',
      amount: 0,
      description: ''
    })
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transferForm.from_fund_id || !transferForm.to_fund_id || !transferForm.amount || !transferForm.description.trim()) {
      toast.error('All fields are required')
      return
    }

    if (transferForm.from_fund_id === transferForm.to_fund_id) {
      toast.error('Cannot transfer to the same fund')
      return
    }

    if (transferForm.amount <= 0) {
      toast.error('Transfer amount must be greater than 0')
      return
    }

    try {
      const response = await fetch('/api/funds/transfer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          church_id: selectedChurch?.id
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to transfer funds')
      }

      toast.success('Fund transfer completed successfully')
      setTransferDialogOpen(false)
      resetTransferForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer funds')
    }
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const filteredFunds = funds.filter(fund => {
    const matchesSearch = fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fund.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || (fund as ExtendedFund).fund_type === filterType

    return matchesSearch && matchesType
  })

  // Calculate summary statistics
  const totalBalance = filteredFunds.reduce((sum, fund) => sum + (fund.current_balance || 0), 0)
  const totalTarget = filteredFunds.reduce((sum, fund) => sum + ((fund as ExtendedFund).target_amount || 0), 0)
  const averageBalance = filteredFunds.length > 0 ? totalBalance / filteredFunds.length : 0


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Fund Management
            </h1>
            <p className="text-muted-foreground">Manage church funds, balances, and allocations</p>
          </div>
          {hasRole('admin') && (
            <div className="flex gap-3">
              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetTransferForm} className="hover:scale-105 transition-all duration-300">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader className="space-y-3 pb-6">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                      Transfer Funds
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                      Transfer funds from one account to another.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleTransferSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from_fund" className="font-medium text-sm">
                          From Fund *
                        </Label>
                        <Select value={transferForm.from_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, from_fund_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source fund" />
                          </SelectTrigger>
                          <SelectContent>
                            {funds.filter(fund => (fund.current_balance || 0) > 0).map((fund) => (
                              <SelectItem
                                key={fund.id}
                                value={fund.id}
                              >
                                {fund.name} (${(fund.current_balance || 0).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to_fund" className="font-medium text-sm">
                          To Fund *
                        </Label>
                        <Select value={transferForm.to_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, to_fund_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination fund" />
                          </SelectTrigger>
                          <SelectContent>
                            {funds.filter(fund => fund.id !== transferForm.from_fund_id).map((fund) => (
                              <SelectItem
                                key={fund.id}
                                value={fund.id}
                              >
                                {fund.name} (${(fund.current_balance || 0).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_amount" className="font-medium text-sm">
                        Transfer Amount *
                      </Label>
                      <Input
                        id="transfer_amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={transferForm.amount || ''}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_description" className="font-medium text-sm">
                        Description *
                      </Label>
                      <Textarea
                        id="transfer_description"
                        value={transferForm.description}
                        onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                        placeholder="Reason for transfer..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTransferDialogOpen(false)}
                        className="order-2 sm:order-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="order-1 sm:order-2"
                      >
                        Transfer Funds
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingFund(null); resetForm(); }} className="hover:scale-105 transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Fund
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="space-y-3 pb-6">
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    {editingFund ? 'Edit Fund' : 'Create New Fund'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                    {editingFund ? 'Update the fund details below.' : 'Create a new fund to track church finances.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-medium text-sm">
                        Fund Name *
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        placeholder="Enter fund name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fund_type" className="font-medium text-sm">
                        Fund Type *
                      </Label>
                      <Select value={form.fund_type} onValueChange={(value) => setForm({ ...form, fund_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fund type" />
                        </SelectTrigger>
                        <SelectContent>
                          {FUND_TYPES.map((type) => (
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
                    <Label htmlFor="target_amount" className="font-medium text-sm">
                      Target Amount (Optional)
                    </Label>
                    <Input
                      id="target_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.target_amount || ''}
                      onChange={(e) => setForm({ ...form, target_amount: parseFloat(e.target.value) || undefined })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-medium text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Fund description and purpose..."
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
                      {editingFund ? 'Update' : 'Create'} Fund
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-income">
                  <AnimatedCounter value={totalBalance} />
                </p>
              </div>
              <div className="p-3 bg-income/15 rounded-xl">
                <DollarSign className="h-8 w-8 text-income" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Funds</p>
                <p className="text-2xl font-bold text-foreground">
                  {filteredFunds.length}
                </p>
              </div>
              <div className="p-3 bg-primary/15 rounded-xl">
                <Banknote className="h-8 w-8 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={averageBalance} />
                </p>
              </div>
              <div className="p-3 bg-purple-500/15 rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Target Amount</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={totalTarget} />
                </p>
              </div>
              <div className="p-3 bg-pending/15 rounded-xl">
                <Eye className="h-8 w-8 text-pending" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Fund Records
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search funds..."
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
                {FUND_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Funds Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFunds.map((fund) => (
              <Card key={fund.id} className="bg-muted/30 hover:bg-accent/50 transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-muted-foreground" />
                      {fund.name}
                    </CardTitle>
                    {hasRole('admin') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <GlassButton variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Fund actions for ${fund.name}`}>
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </GlassButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-dropdown">
                          <DropdownMenuItem onClick={() => handleEdit(fund)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(fund.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {(fund as ExtendedFund).fund_type || `${fund.name} Fund`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        <AnimatedCounter value={fund.current_balance || 0} />
                      </p>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                    </div>
                    
                    {(fund as ExtendedFund).target_amount && (fund as ExtendedFund).target_amount! > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Target Progress</span>
                          <span className="text-foreground">
                            {Math.min(100, ((fund.current_balance || 0) / ((fund as ExtendedFund).target_amount || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-income h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((fund.current_balance || 0) / ((fund as ExtendedFund).target_amount || 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: <AnimatedCounter value={(fund as ExtendedFund).target_amount!} />
                        </p>
                      </div>
                    )}
                    
                    {fund.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {fund.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFunds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No funds found matching your criteria.
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Fund Transactions
          </h3>
          <div className="space-y-2">
            {recentTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-accent transition-colors">
                <div>
                  <div className="font-medium text-foreground">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.category} • {transaction.fund?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {transaction.type === 'income' ? '+' : '-'}<AnimatedCounter value={transaction.amount} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(transaction.transaction_date)}
                  </div>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No recent transactions found
              </div>
            )}
          </div>
        </Card>
      </div>
      <ConfirmationDialog />
    </div>
  )
}