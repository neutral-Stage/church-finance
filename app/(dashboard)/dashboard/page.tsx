'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Gift,
  Receipt,
  CreditCard,
  Banknote
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading dashboard: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || user?.email}
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s an overview of your church finances
          </p>
        </div>

        {canEdit() && (
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/transactions">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/offerings">
                <Gift className="mr-2 h-4 w-4" />
                Record Offering
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalBalance())}</div>
            <p className="text-xs text-muted-foreground">
              Across all funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.monthlyStats.income || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.monthlyStats.expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <TrendingUp className={`h-4 w-4 ${(data?.monthlyStats.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data?.monthlyStats.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {formatCurrency(data?.monthlyStats.netIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fund Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.funds.map((fund) => (
          <Card key={fund.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{fund.name} Fund</CardTitle>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {formatCurrency(Number(fund.current_balance))}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total Income:</span>
                  <span className="text-green-600">
                    {formatCurrency(Number(fund.total_income))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="text-red-600">
                    {formatCurrency(Number(fund.total_expenses))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Offerings:</span>
                  <span className="text-blue-600">
                    {formatCurrency(Number(fund.total_offerings))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest financial activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentTransactions.slice(0, 5).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>{transaction.fund?.name}</TableCell>
                    <TableCell className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data?.recentTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No recent transactions
              </p>
            )}
            <div className="mt-4">
              <Button variant="outline" asChild className="w-full">
                <Link href="/transactions">View All Transactions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts and Upcoming Items */}
        <div className="space-y-6">
          {/* Upcoming Bills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Upcoming Bills
              </CardTitle>
              <CardDescription>
                Bills due soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.upcomingBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{bill.vendor_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(bill.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(Number(bill.amount))}</p>
                      <Badge variant={getStatusColor(bill.status)}>
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data?.upcomingBills.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No upcoming bills
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/bills">Manage Bills</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Outstanding Advances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Outstanding Advances
              </CardTitle>
              <CardDescription>
                Money advanced to be returned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.outstandingAdvances.map((advance) => (
                  <div key={advance.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{advance.recipient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Expected: {formatDate(advance.expected_return_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(Number(advance.amount) - Number(advance.amount_returned))}
                      </p>
                      <Badge variant={getStatusColor(advance.status)}>
                        {advance.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data?.outstandingAdvances.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No outstanding advances
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" asChild className="w-full">
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