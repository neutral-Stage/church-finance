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
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRightLeft, TrendingUp, TrendingDown, Banknote, History, AlertCircle, Sparkles } from 'lucide-react'
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
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0)
  const countRef = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const startTime = Date.now()
          const startValue = 0
          const endValue = value

          const updateCount = () => {
            const now = Date.now()
            const progress = Math.min((now - startTime) / duration, 1)
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const currentValue = startValue + (endValue - startValue) * easeOutQuart
            
            setCount(currentValue)
            
            if (progress < 1) {
              requestAnimationFrame(updateCount)
            }
          }
          
          requestAnimationFrame(updateCount)
        }
      },
      { threshold: 0.1 }
    )

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

  return (
    <div ref={countRef} className="text-2xl font-bold">
      {formatCurrency(count)}
    </div>
  )
}

export default function FundsPage() {
  const { user, hasRole } = useAuth()
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load funds data')
    } finally {
      setLoading(false)
    }
  }

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
      // Create two transactions: one outgoing from source fund, one incoming to destination fund
      const fromFundName = funds.find(f => f.id === transferForm.from_fund_id)?.name
      const toFundName = funds.find(f => f.id === transferForm.to_fund_id)?.name

      const transactions = [
        {
          type: 'expense' as const,
          category: 'Fund Transfer',
          amount: amount,
          description: 'Transfer to ' + toFundName + ': ' + transferForm.description,
          fund_id: transferForm.from_fund_id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        },
        {
          type: 'income' as const,
          category: 'Fund Transfer',
          amount: amount,
          description: 'Transfer from ' + fromFundName + ': ' + transferForm.description,
          fund_id: transferForm.to_fund_id,
          transaction_date: new Date().toISOString().split('T')[0],
          created_by: user?.id
        }
      ]

      const { error } = await supabase
        .from('transactions')
        .insert(transactions)

      if (error) throw error

      toast.success('Successfully transferred ' + formatCurrency(amount) + ' from ' + fromFundName + ' to ' + toFundName)
      setTransferDialogOpen(false)
      resetTransferForm()
      fetchData()
    } catch (error) {
      console.error('Error processing transfer:', error)
      toast.error('Failed to process fund transfer')
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
    return (
      <div className="min-h-screen gradient-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-pink-500/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '3s'}}></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative mb-8">
              {/* Outer spinner */}
              <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin backdrop-blur-sm"></div>
              {/* Inner spinner */}
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
            </div>
            <div className="text-xl text-white font-medium animate-pulse">
              Loading funds and transfers...
            </div>
            <div className="text-white/60 mt-2 animate-pulse" style={{animationDelay: '0.5s'}}>
              Please wait while we fetch your data
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="flex justify-between items-center animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Fund Management
            </h1>
            <p className="text-white/70 mt-2">Manage church funds and transfers</p>
          </div>
          {hasRole('Admin') && (
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetTransferForm} className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:scale-105 transition-all duration-300 rounded-xl px-6 py-3">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Funds
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Transfer Between Funds</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Move money from one fund to another. This will create corresponding transactions.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_fund_id" className="text-white">From Fund *</Label>
                    <Select value={transferForm.from_fund_id} onValueChange={(value) => setTransferForm({ ...transferForm, from_fund_id: value })}>
                      <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl">
                        <SelectValue placeholder="Select source fund" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl">
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
                      <SelectTrigger className="bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl">
                        <SelectValue placeholder="Select destination fund" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl">
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
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20"
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
                      className="bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/50 rounded-xl focus:border-white/40 focus:ring-white/20"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)} className="bg-transparent border border-white/20 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 hover:scale-105 transition-all duration-300 rounded-xl">
                      Transfer Funds
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Total Balance',
              value: totalBalance,
              subtitle: 'Across ' + funds.length + ' funds',
              icon: Banknote,
              delay: 100
            },
            {
              title: 'Highest Balance',
              value: fundWithHighestBalance.current_balance,
              subtitle: fundWithHighestBalance.name,
              icon: TrendingUp,
              delay: 200
            },
            {
              title: 'Lowest Balance',
              value: fundWithLowestBalance.current_balance,
              subtitle: fundWithLowestBalance.name,
              icon: TrendingDown,
              delay: 300
            },
            {
              title: 'Recent Activity',
              value: recentTransactions.length,
              subtitle: 'Transactions (last 20)',
              icon: History,
              delay: 400,
              isCount: true
            }
          ].map((item, index) => {
            const IconComponent = item.icon
            return (
              <Card 
                key={index}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/15 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4"
                style={{ animationDelay: item.delay + 'ms' }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">{item.title}</CardTitle>
                  <div className="bg-white/10 p-2 rounded-lg">
                    <IconComponent className="h-4 w-4 text-white" />
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
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {funds.map((fund, index) => {
            const activity = getFundActivity(fund.id)
            const netChange = activity.income - activity.expense
            
            return (
              <Card 
                key={fund.id}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/15 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4"
                style={{ animationDelay: (500 + index * 100) + 'ms' }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-white font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{fund.name}</CardTitle>
                      <CardDescription className="text-white/60">{fund.description}</CardDescription>
                    </div>
                    {fund.current_balance < 1000 && (
                      <Badge variant="warning" className="ml-2 bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Low
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-xl p-4 rounded-xl border border-white/10">
                      <AnimatedCounter value={fund.current_balance} />
                      <p className="text-xs text-white/60 mt-1">Current Balance</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-blue-300" />
                        Last 30 Days Activity
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10">
                          <div className="text-green-300 font-medium">+{formatCurrency(activity.income)}</div>
                          <div className="text-xs text-white/60">Income</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/10">
                          <div className="text-red-300 font-medium">-{formatCurrency(activity.expense)}</div>
                          <div className="text-xs text-white/60">Expenses</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/20">
                        <div className={'font-medium ' + (netChange >= 0 ? 'text-green-300' : 'text-red-300')}>
                          {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                        </div>
                        <div className="text-xs text-white/60">Net Change</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Transactions */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in" style={{ animationDelay: '800ms' }}>
          <CardHeader>
            <CardTitle className="text-white font-semibold flex items-center bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              <History className="w-5 h-5 mr-2 text-blue-300" />
              Recent Fund Transactions
            </CardTitle>
            <CardDescription className="text-white/60">Latest transactions across all funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/5">
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Fund</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Category</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-white/90">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 10).map((transaction, index) => (
                      <tr 
                        key={transaction.id} 
                        className="border-b border-white/10 hover:bg-white/5 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4"
                        style={{ animationDelay: (900 + index * 50) + 'ms' }}
                      >
                        <td className="p-4 text-white/80">{formatDate(transaction.transaction_date)}</td>
                        <td className="p-4 text-white/80">{transaction.fund.name}</td>
                        <td className="p-4">
                          <Badge 
                            variant={transaction.type === 'income' ? 'success' : 'destructive'}
                            className="bg-white/10 backdrop-blur-xl border border-white/20"
                          >
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-white/80">{transaction.category}</td>
                        <td className="p-4 font-medium">
                          <span className={transaction.type === 'income' ? 'text-green-300' : 'text-red-300'}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-white/70">{transaction.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recentTransactions.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  No recent transactions found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}