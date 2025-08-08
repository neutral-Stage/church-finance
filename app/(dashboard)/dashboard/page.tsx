'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  AlertTriangle,
  Plus,
  Gift,
  Activity,
} from 'lucide-react'
import { FundSummary, TransactionWithFund, BillWithFund, AdvanceWithFund } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface DashboardData {
  funds: FundSummary[]
  recentTransactions: TransactionWithFund[]
  upcomingBills: BillWithFund[]
  outstandingAdvances: AdvanceWithFund[]
  monthlyStats: {
    income: number
    expenses: number
    netIncome: number
  }
}

// Animated Counter Component
function AnimatedCounter({ value, duration = 2000, prefix = '', suffix = '' }: {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const countRef = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (hasAnimated || value === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
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
            } else {
              setCount(endValue)
            }
          }

          requestAnimationFrame(updateCount)
          observer.disconnect()
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
    <span ref={countRef}>
      {prefix}{typeof value === 'number' && value % 1 !== 0 ? count.toFixed(2) : Math.floor(count).toLocaleString()}{suffix}
    </span>
  )
}

export default function DashboardPage(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, canEdit } = useAuth()

  useEffect(() => {
    fetchDashboardData()

    // Set up real-time subscriptions
    const fundsSubscription = supabase
      .channel('funds_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funds' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    const transactionsSubscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      fundsSubscription.unsubscribe()
      transactionsSubscription.unsubscribe()
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch fund summaries
      const { data: funds, error: fundsError } = await supabase
        .from('fund_summary')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      // Fetch recent transactions with fund details
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          fund:funds(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (transactionsError) throw transactionsError

      // Fetch upcoming bills
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select(`
          *,
          fund:funds(*)
        `)
        .in('status', ['pending', 'overdue'])
        .order('due_date')
        .limit(5)

      if (billsError) throw billsError

      // Fetch outstanding advances
      const { data: advances, error: advancesError } = await supabase
        .from('advances')
        .select(`
          *,
          fund:funds(*)
        `)
        .in('status', ['outstanding', 'partial'])
        .order('expected_return_date')
        .limit(5)

      if (advancesError) throw advancesError

      // Calculate monthly stats
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

      const { data: monthlyIncome, error: incomeError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`)

      const { data: monthlyExpenses, error: expensesError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`)

      if (incomeError || expensesError) {
        throw incomeError || expensesError
      }

      const totalIncome = monthlyIncome?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
      const totalExpenses = monthlyExpenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

      setData({
        funds: funds || [],
        recentTransactions: transactions || [],
        upcomingBills: bills || [],
        outstandingAdvances: advances || [],
        monthlyStats: {
          income: totalIncome,
          expenses: totalExpenses,
          netIncome: totalIncome - totalExpenses
        }
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getTotalBalance = () => {
    return data?.funds.reduce((sum, fund) => sum + Number(fund.current_balance), 0) || 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'destructive'
      case 'pending': return 'secondary'
      case 'outstanding': return 'destructive'
      case 'partial': return 'secondary'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative">
            <Activity className="h-12 w-12 animate-spin text-white/60 mx-auto mb-4" />
            <Activity className="h-8 w-8 animate-spin text-white/80 mx-auto mb-4 absolute top-2 left-1/2 transform -translate-x-1/2 animate-reverse-spin" />
          </div>
          <p className="text-white/70 text-lg">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-xl">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">Error loading dashboard: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in animate-slide-in-from-top-4 animate-duration-700">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            <Activity className="h-10 w-10 text-white/80" />
            Church Finance Dashboard
          </h1>
          <p className="text-white/60 mt-2 text-lg">
            Welcome back, {user?.full_name || user?.email} - Overview of your church finances
          </p>
        </div>
        {canEdit() && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="bg-white/10 border-white/20 text-white/90 hover:bg-white/15 backdrop-blur-sm transition-all duration-300">
              <Link href="/transactions">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 transition-all duration-300">
              <Link href="/offerings">
                <Gift className="h-4 w-4 mr-2" />
                Record Offering
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `800ms` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Total Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white/90">
              <AnimatedCounter value={getTotalBalance()} />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `900ms` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white/90">
              <AnimatedCounter value={data?.monthlyStats.income || 0} />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `1000ms` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white/90">
              <AnimatedCounter value={data?.monthlyStats.expenses || 0} />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl border-green-400/30 hover:from-green-500/25 hover:to-emerald-600/25 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `1100ms` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-200">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-100">
              <AnimatedCounter value={data?.monthlyStats.netIncome || 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.funds.map((fund, index) => {
          const balance = Number(fund.current_balance) || 0;
          const income = Number(fund.total_income) || 0;
          const expenses = Number(fund.total_expenses) || 0;
          const offerings = Number(fund.total_offerings) || 0;

          return (
            <Card key={fund.id} className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `${1200 + index * 100}ms` }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white/90">{fund.name}</CardTitle>
                <div className="text-3xl font-bold text-white">
                  <AnimatedCounter value={balance} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-green-500/20 p-2 rounded-lg backdrop-blur-sm">
                    <div className="text-green-300 font-medium">
                      <AnimatedCounter value={income} />
                    </div>
                    <div className="text-green-200/70 text-xs">Income</div>
                  </div>
                  <div className="bg-red-500/20 p-2 rounded-lg backdrop-blur-sm">
                    <div className="text-red-300 font-medium">
                      <AnimatedCounter value={expenses} />
                    </div>
                    <div className="text-red-200/70 text-xs">Expenses</div>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-lg backdrop-blur-sm">
                    <div className="text-blue-300 font-medium">
                      <AnimatedCounter value={offerings} />
                    </div>
                    <div className="text-blue-200/70 text-xs">Offerings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mobile-grid lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `1500ms` }}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white/90">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/70">Description</TableHead>
                    <TableHead className="text-white/70">Fund</TableHead>
                    <TableHead className="text-white/70">Amount</TableHead>
                    <TableHead className="text-white/70">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentTransactions.slice(0, 5).map((transaction) => (
                    <TableRow key={transaction.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white/90">{transaction.description}</TableCell>
                      <TableCell className="text-white/70">{transaction.fund?.name}</TableCell>
                      <TableCell className={`font-medium ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {formatDate(transaction.transaction_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                asChild
                className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
              >
                <Link href="/transactions">View All Transactions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts and Upcoming Items */}
        <div className="space-y-6">
          {/* Upcoming Bills */}
          <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `1600ms` }}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white/90">Upcoming Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.upcomingBills.slice(0, 5).map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{bill.vendor_name}</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Due: {formatDate(bill.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          {formatCurrency(Number(bill.amount))}
                        </div>
                        <Badge
                          variant={getStatusColor(bill.status)}
                          className="mt-1 text-xs"
                        >
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {data?.upcomingBills.length === 0 && (
                  <p className="text-center text-white/60 py-8">
                    No upcoming bills
                  </p>
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  asChild
                  className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
                >
                  <Link href="/bills">Manage Bills</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Advances */}
          <Card className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `1700ms` }}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white/90">Outstanding Advances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.outstandingAdvances.slice(0, 5).map((advance) => (
                  <div
                    key={advance.id}
                    className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{advance.recipient_name}</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Expected: {formatDate(advance.expected_return_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          {formatCurrency(Number(advance.amount) - Number(advance.amount_returned))}
                        </div>
                        <Badge
                          variant={getStatusColor(advance.status)}
                          className="mt-1 text-xs"
                        >
                          {advance.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {data?.outstandingAdvances.length === 0 && (
                  <p className="text-center text-white/60 py-8">
                    No outstanding advances
                  </p>
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  asChild
                  className="bg-white/10 border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
                >
                  <Link href="/advances">Manage Advances</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}