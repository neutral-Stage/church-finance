'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRightLeft, TrendingUp, TrendingDown, Banknote, History, AlertCircle, Sparkles } from 'lucide-react'
import { FullScreenLoader } from '@/components/ui/loader'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Fund = Database['public']['Tables']['funds']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionWithFund extends Transaction {
  fund: Fund
}

interface TransferForm {
  from_fund_id: string
  to_fund_id: string
  amount: string
  description: string
}

// Animated Counter Component
interface AnimatedCounterProps {
  value: number
  duration?: number
  formatter?: (value: number) => string
}

function AnimatedCounter({ value, duration = 2000, formatter = (v) => formatCurrency(v) }: AnimatedCounterProps) {
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
  }, [isVisible])

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

export default function FundsPage(): JSX.Element {
  const { hasRole } = useAuth()
  const [funds, setFunds] = useState<Fund[]>([])
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithFund[]>([])
  const [loading, setLoading] = useState(true)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferForm, setTransferForm] = useState<TransferForm>({
    from_fund_id: '',
    to_fund_id: '',
    amount: '',
    description: ''
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      // Fetch recent transactions for all funds
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*, fund:funds(*)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (transactionsError) throw transactionsError

      setFunds(fundsData || [])
      setRecentTransactions(transactionsData || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load funds data'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transferForm.from_fund_id || !transferForm.to_fund_id || !transferForm.amount || !transferForm.description) {
      toast.error('Please fill in all required fields')
      return
    }

    if (transferForm.from_fund_id === transferForm.to_fund_id) {
      toast.error('Cannot transfer to the same fund')
      return
    }

    const amount = parseFloat(transferForm.amount)
    if (amount <= 0) {
      toast.error('Transfer amount must be greater than zero')
      return
    }

    // Check if source fund has sufficient balance
    const fromFund = funds.find(f => f.id === transferForm.from_fund_id)
    if (!fromFund || fromFund.current_balance < amount) {
      toast.error('Insufficient balance in source fund')
      return
    }

    try {
      const fromFundName = funds.find(f => f.id === transferForm.from_fund_id)?.name
      const toFundName = funds.find(f => f.id === transferForm.to_fund_id)?.name

      // Get current fund balances for validation
      const { data: currentFunds, error: fundsError } = await supabase
        .from('funds')
        .select('id, current_balance')
        .in('id', [transferForm.from_fund_id, transferForm.to_fund_id])

      if (fundsError) {
        throw new Error('Failed to retrieve current fund balances')
      }

      const currentFromFund = currentFunds?.find(f => f.id === transferForm.from_fund_id)
      const currentToFund = currentFunds?.find(f => f.id === transferForm.to_fund_id)

      if (!currentFromFund || !currentToFund) {
        throw new Error('One or both funds not found')
      }

      // Double-check balance with current data
      if (currentFromFund.current_balance < amount) {
        throw new Error('Insufficient balance in source fund')
      }

      // Update source fund balance (subtract amount)
      const { error: fromFundError } = await supabase
        .from('funds')
        .update({ current_balance: currentFromFund.current_balance - amount })
        .eq('id', transferForm.from_fund_id)

      if (fromFundError) {
        throw new Error('Failed to update source fund balance')
      }

      // Update destination fund balance (add amount)
      const { error: toFundError } = await supabase
        .from('funds')
        .update({ current_balance: currentToFund.current_balance + amount })
        .eq('id', transferForm.to_fund_id)

      if (toFundError) {
        // Rollback source fund update
        await supabase
          .from('funds')
          .update({ current_balance: currentFromFund.current_balance })
          .eq('id', transferForm.from_fund_id)
        throw new Error('Failed to update destination fund balance')
      }

      // Create expense transaction for source fund
      const { error: expenseError } = await supabase
        .from('transactions')
        .insert({
          fund_id: transferForm.from_fund_id,
          type: 'expense',
          amount: amount,
          description: `Transfer to ${toFundName}: ${transferForm.description}`,
          category: 'Transfer'
        })

      if (expenseError) {
        // Rollback fund balance updates
        await Promise.all([
          supabase.from('funds').update({ current_balance: currentFromFund.current_balance }).eq('id', transferForm.from_fund_id),
          supabase.from('funds').update({ current_balance: currentToFund.current_balance }).eq('id', transferForm.to_fund_id)
        ])
        throw new Error('Failed to create expense transaction')
      }

      // Create income transaction for destination fund
      const { error: incomeError } = await supabase
        .from('transactions')
        .insert({
          fund_id: transferForm.to_fund_id,
          type: 'income',
          amount: amount,
          description: `Transfer from ${fromFundName}: ${transferForm.description}`,
          category: 'Transfer'
        })

      if (incomeError) {
        // Rollback fund balance updates and delete expense transaction
        await Promise.all([
          supabase.from('funds').update({ current_balance: currentFromFund.current_balance }).eq('id', transferForm.from_fund_id),
          supabase.from('funds').update({ current_balance: currentToFund.current_balance }).eq('id', transferForm.to_fund_id),
          supabase.from('transactions').delete().eq('fund_id', transferForm.from_fund_id).eq('type', 'expense').eq('amount', amount).eq('description', `Transfer to ${toFundName}: ${transferForm.description}`)
        ])
        throw new Error('Failed to create income transaction')
      }

      toast.success('Successfully transferred ' + formatCurrency(amount) + ' from ' + fromFundName + ' to ' + toFundName)
      setTransferDialogOpen(false)
      resetTransferForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process fund transfer')
    }
  }

  const resetTransferForm = () => {
    setTransferForm({
      from_fund_id: '',
      to_fund_id: '',
      amount: '',
      description: ''
    })
  }

  // Calculate fund statistics
  const totalBalance = funds.reduce((sum, fund) => sum + fund.current_balance, 0)
  const fundWithHighestBalance = funds.reduce((max, fund) =>
    fund.current_balance > max.current_balance ? fund : max, funds[0] || { current_balance: 0, name: 'N/A' })
  const fundWithLowestBalance = funds.reduce((min, fund) =>
    fund.current_balance < min.current_balance ? fund : min, funds[0] || { current_balance: 0, name: 'N/A' })

  // Get fund-specific transactions for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const getFundActivity = (fundId: string) => {
    return recentTransactions
      .filter(t => t.fund_id === fundId && new Date(t.created_at) >= thirtyDaysAgo)
      .reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount
        else acc.expense += t.amount
        return acc
      }, { income: 0, expense: 0 })
  }

  if (loading) {
    return <FullScreenLoader message="Loading funds and transfers..." />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        <div className="glass-card-dark backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-12 animate-fade-in animate-slide-in-from-bottom-4 shadow-lg hover:bg-white/15 transition-all duration-500" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent mb-3">
                Fund Management
              </h1>
              <p className="text-white/70 text-lg font-medium">Monitor and manage church funds</p>
            </div>
            {hasRole('admin') && (
              <div className="flex-shrink-0">
                <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetTransferForm} className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 px-6 py-3 text-base font-semibold w-full sm:w-auto">
                      <ArrowRightLeft className="mr-2 h-5 w-5" />
                      Transfer Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-white bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Transfer Between Funds</DialogTitle>
                      <DialogDescription className="text-white/70">
                        Move money from one fund to another. This will create corresponding transactions.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTransfer} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="from_fund_id" className="text-white">From Fund *</Label>
                        <Select value={transferForm.from_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, from_fund_id: value })}>
                          <SelectTrigger className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/15 transition-all duration-300">
                            <SelectValue placeholder="Select source fund" />
                          </SelectTrigger>
                          <SelectContent className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                            {funds.map((fund) => (
                              <SelectItem key={fund.id} value={fund.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                                {fund.name} ({formatCurrency(fund.current_balance)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to_fund_id" className="text-white">To Fund *</Label>
                        <Select value={transferForm.to_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, to_fund_id: value })}>
                          <SelectTrigger className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/15 transition-all duration-300">
                            <SelectValue placeholder="Select destination fund" />
                          </SelectTrigger>
                          <SelectContent className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
                            {funds
                              .filter(fund => fund.id !== transferForm.from_fund_id)
                              .map((fund) => (
                                <SelectItem key={fund.id} value={fund.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                                  {fund.name} ({formatCurrency(fund.current_balance)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-white">Transfer Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                          className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20 hover:bg-white/15 transition-all duration-300"
                          required
                        />
                        {transferForm.from_fund_id && (
                          <p className="text-xs text-white/60">
                            Available: {formatCurrency(funds.find(f => f.id === transferForm.from_fund_id)?.current_balance || 0)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Description *</Label>
                        <Textarea
                          id="description"
                          value={transferForm.description}
                          onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                          placeholder="Reason for this transfer..."
                          className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20 hover:bg-white/15 transition-all duration-300"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <GlassButton type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
                          Cancel
                        </GlassButton>
                        <GlassButton type="submit">
                          Transfer Funds
                        </GlassButton>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            {
              title: 'Total Balance',
              value: totalBalance,
              subtitle: 'Across ' + funds.length + ' funds',
              icon: Banknote,
              delay: 100,
              gradient: 'from-blue-500/20 to-purple-500/20'
            },
            {
              title: 'Highest Balance',
              value: fundWithHighestBalance.current_balance,
              subtitle: fundWithHighestBalance.name,
              icon: TrendingUp,
              delay: 200,
              gradient: 'from-green-500/20 to-emerald-500/20'
            },
            {
              title: 'Lowest Balance',
              value: fundWithLowestBalance.current_balance,
              subtitle: fundWithLowestBalance.name,
              icon: TrendingDown,
              delay: 300,
              gradient: 'from-orange-500/20 to-red-500/20'
            },
            {
              title: 'Recent Activity',
              value: recentTransactions.length,
              subtitle: 'Transactions (last 20)',
              icon: History,
              delay: 400,
              isCount: true,
              gradient: 'from-indigo-500/20 to-blue-500/20'
            }
          ].map((item, index) => {
            const IconComponent = item.icon
            return (
              <Card
                key={index}
                className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4"
                style={{ animationDelay: (index * 100) + 'ms' }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">{item.title}</CardTitle>
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <IconComponent className="h-4 w-4 text-white/80" />
                  </div>
                </CardHeader>
                <CardContent>
                  {item.isCount ? (
                    <div className="text-2xl font-bold text-white">{item.value}</div>
                  ) : (
                    <AnimatedCounter value={item.value} />
                  )}
                  <p className="text-xs text-white/60 mt-1">
                    {item.subtitle}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Fund Details */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 animate-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '500ms' }}>
          {funds.map((fund, index) => {
            const activity = getFundActivity(fund.id)
            const netChange = activity.income - activity.expense

            return (
              <Card
                key={fund.id}
                className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/15 hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-fade-in animate-slide-in-from-bottom-4 shadow-lg"
                style={{ animationDelay: (500 + index * 100) + 'ms' }}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-white font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent mb-2">{fund.name}</CardTitle>
                      <CardDescription className="text-white/70 text-sm font-medium">{fund.description}</CardDescription>
                    </div>
                    {fund.current_balance < 1000 && (
                      <Badge variant="warning" className="ml-3 bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse shadow-lg">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Low
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 rounded-xl border border-white/20 shadow-lg">
                      <AnimatedCounter value={fund.current_balance} />
                      <p className="text-sm text-white/70 mt-2 font-medium">Current Balance</p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-white flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-blue-300" />
                        Last 30 Days Activity
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-lg">
                          <div className="text-green-300 font-bold text-lg">+{formatCurrency(activity.income)}</div>
                          <div className="text-sm text-white/70 font-medium">Income</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/10 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-lg">
                          <div className="text-red-300 font-bold text-lg">-{formatCurrency(activity.expense)}</div>
                          <div className="text-sm text-white/70 font-medium">Expenses</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/30">
                        <div className={'font-bold text-lg ' + (netChange >= 0 ? 'text-green-300' : 'text-red-300')}>
                          {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                        </div>
                        <div className="text-sm text-white/70 font-medium">Net Change</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Transactions */}
        <Card className="glass-card-dark bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in animate-slide-in-from-bottom-4 shadow-lg hover:bg-white/15 transition-all duration-500" style={{ animationDelay: '800ms' }}>
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl text-white font-bold bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent flex items-center">
              <History className="w-6 h-6 mr-3 text-blue-300" />
              Recent Fund Transactions
            </CardTitle>
            <CardDescription className="text-white/70 text-base font-medium">Latest transactions across all funds</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/30 bg-white/5">
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Date</th>
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Fund</th>
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Type</th>
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Category</th>
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Amount</th>
                      <th className="h-12 px-6 text-left align-middle font-semibold text-white/90 text-sm">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 10).map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-white/20 hover:bg-white/10 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 group"
                        style={{ animationDelay: (900 + index * 50) + 'ms' }}
                      >
                        <td className="p-4 text-white/80 font-medium">{formatDate(transaction.transaction_date)}</td>
                        <td className="p-4 text-white/80 font-medium">{transaction.fund.name}</td>
                        <td className="p-4">
                          <Badge
                            variant={transaction.type === 'income' ? 'success' : 'destructive'}
                            className={transaction.type === 'income'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30 shadow-lg font-semibold'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-lg font-semibold'
                            }
                          >
                            {transaction.type === 'income' ? 'Income' : 'Expense'}
                          </Badge>
                        </td>
                        <td className="p-4 text-white/80 font-medium">{transaction.category}</td>
                        <td className="p-4 font-bold text-lg">
                          <span className={transaction.type === 'income' ? 'text-green-300' : 'text-red-300'}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-white/80 font-medium">{transaction.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recentTransactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-white/5 backdrop-blur-xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <History className="w-10 h-10 text-white/50" />
                  </div>
                  <p className="text-white/70 text-lg font-medium">No recent transactions found</p>
                  <p className="text-white/50 text-sm mt-2">Fund transactions will appear here once created</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}