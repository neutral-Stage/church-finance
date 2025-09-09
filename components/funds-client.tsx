'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, MoreHorizontal, Edit, Trash2, Banknote, TrendingUp, Eye, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Fund, TransactionWithFund } from '@/lib/server-data'
import type { FundsPageData } from '@/lib/server-data'

interface FundForm {
  name: string
  description: string
  target_amount?: number
  fund_type: string
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
  const [funds, setFunds] = useState<Fund[]>(initialData.funds)
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithFund[]>(initialData.recentTransactions)
  const [dialogOpen, setDialogOpen] = useState(false)
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

  const fetchData = async () => {
    try {
      const [fundsResult, transactionsResult] = await Promise.all([
        supabase
          .from('funds')
          .select('*')
          .order('name'),
        supabase
          .from('transactions')
          .select(`
            *,
            fund:funds(*)
          `)
          .order('created_at', { ascending: false })
          .limit(20)
      ])

      if (fundsResult.error) throw fundsResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setFunds(fundsResult.data || [])
      setRecentTransactions(transactionsResult.data || [])
    } catch (error) {
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
        const { error } = await supabase
          .from('funds')
          .update(requestData)
          .eq('id', editingFund.id)

        if (error) throw error
        toast.success('Fund updated successfully')
      } else {
        const { error } = await supabase
          .from('funds')
          .insert({
            ...requestData,
            current_balance: 0
          })

        if (error) throw error
        toast.success('Fund created successfully')
      }

      setDialogOpen(false)
      setEditingFund(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error('Failed to save fund')
    }
  }

  const handleEdit = (fund: Fund) => {
    setEditingFund(fund)
    setForm({
      name: fund.name,
      description: fund.description || '',
      target_amount: (fund as any).target_amount || undefined,
      fund_type: (fund as any).fund_type || 'Management Fund'
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

      const { error } = await supabase
        .from('funds')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Fund deleted successfully')
      fetchData()
    } catch (error) {
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

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const filteredFunds = funds.filter(fund => {
    const matchesSearch = fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fund.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || (fund as any).fund_type === filterType

    return matchesSearch && matchesType
  })

  // Calculate summary statistics
  const totalBalance = filteredFunds.reduce((sum, fund) => sum + fund.current_balance, 0)
  const totalTarget = filteredFunds.reduce((sum, fund) => sum + ((fund as any).target_amount || 0), 0)
  const averageBalance = filteredFunds.length > 0 ? totalBalance / filteredFunds.length : 0
  const fundsWithTargets = filteredFunds.filter(fund => (fund as any).target_amount && (fund as any).target_amount > 0)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-green-400/30 to-emerald-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-indigo-400/25 to-blue-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Fund Management
            </h1>
            <p className="text-white/70">Manage church funds, balances, and allocations</p>
          </div>
          {hasRole('admin') && (
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingFund(null); resetForm(); }} className="glass-button hover:scale-105 transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="space-y-3 pb-6">
                  <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    {editingFund ? 'Edit Fund' : 'Create New Fund'}
                  </DialogTitle>
                  <DialogDescription className="text-white/70 text-sm leading-relaxed">
                    {editingFund ? 'Update the fund details below.' : 'Create a new fund to track church finances.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/90 font-medium text-sm">
                        Fund Name *
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20 hover:bg-white/15 transition-all duration-300"
                        placeholder="Enter fund name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fund_type" className="text-white/90 font-medium text-sm">
                        Fund Type *
                      </Label>
                      <Select value={form.fund_type} onValueChange={(value) => setForm({ ...form, fund_type: value })}>
                        <SelectTrigger className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/15 transition-all duration-300">
                          <SelectValue placeholder="Select fund type" />
                        </SelectTrigger>
                        <SelectContent className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                          {FUND_TYPES.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="text-white hover:bg-white/20 focus:bg-white/20 rounded-lg transition-colors duration-200"
                            >
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_amount" className="text-white/90 font-medium text-sm">
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
                      className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20 hover:bg-white/15 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-white/90 font-medium text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Fund description and purpose..."
                      rows={3}
                      className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20 hover:bg-white/15 transition-all duration-300 resize-none"
                    />
                  </div>

                  <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                    <GlassButton
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="order-2 sm:order-1"
                    >
                      Cancel
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      className="order-1 sm:order-2"
                    >
                      {editingFund ? 'Update' : 'Create'} Fund
                    </GlassButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Total Balance</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  <AnimatedCounter value={totalBalance} />
                </p>
              </div>
              <div className="p-3 bg-green-500/20 backdrop-blur-sm rounded-xl">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Total Funds</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {filteredFunds.length}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl">
                <Banknote className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Average Balance</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  <AnimatedCounter value={averageBalance} />
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Target Amount</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  <AnimatedCounter value={totalTarget} />
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 backdrop-blur-sm rounded-xl">
                <Eye className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
            Fund Records
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search funds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input sm:max-w-xs"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="glass-input sm:max-w-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="glass-dropdown">
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
              <Card key={fund.id} className="glass-card hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white/90 flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-white/70" />
                      {fund.name}
                    </CardTitle>
                    {hasRole('admin') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <GlassButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4 text-white/70" />
                          </GlassButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-dropdown">
                          <DropdownMenuItem onClick={() => handleEdit(fund)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(fund.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/30 text-white/80 text-xs">
                      {(fund as any).fund_type || 'Management Fund'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-white/90">
                        <AnimatedCounter value={fund.current_balance} />
                      </p>
                      <p className="text-sm text-white/60">Current Balance</p>
                    </div>
                    
                    {(fund as any).target_amount && (fund as any).target_amount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/70">Target Progress</span>
                          <span className="text-white/80">
                            {Math.min(100, (fund.current_balance / (fund as any).target_amount) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (fund.current_balance / (fund as any).target_amount) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Target: <AnimatedCounter value={(fund as any).target_amount} />
                        </p>
                      </div>
                    )}
                    
                    {fund.description && (
                      <p className="text-sm text-white/60 line-clamp-3">
                        {fund.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFunds.length === 0 && (
            <div className="text-center py-8 text-white/60">
              No funds found matching your criteria.
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-4">
            Recent Fund Transactions
          </h3>
          <div className="space-y-2">
            {recentTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div>
                  <div className="font-medium text-white/90">{transaction.description}</div>
                  <div className="text-sm text-white/60">
                    {transaction.category} • {transaction.fund?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.type === 'income' ? '+' : '-'}<AnimatedCounter value={transaction.amount} />
                  </div>
                  <div className="text-sm text-white/60">
                    {formatDate(transaction.transaction_date)}
                  </div>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center py-4 text-white/60">
                No recent transactions found
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationDialog />
    </div>
  )
}