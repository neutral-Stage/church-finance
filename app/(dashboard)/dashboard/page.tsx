'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { FullScreenLoader } from '@/components/ui/loader'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassButton,
  GlassTable,
  GlassTableHeader,
  GlassTableBody,
  GlassTableRow,
  GlassTableHead,
  GlassTableCell,
  AnimatedBackground,
  StatusBadge,
  Heading,
  Text,
  Container,
  Grid,
  Section
} from '@/components/ui'
import {
  AlertTriangle,
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

export default function DashboardPage(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, canEdit } = useAuth()

  const fetchDashboardData = useCallback(async () => {
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
  }, [])

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
  }, [fetchDashboardData])

  const getTotalBalance = () => {
    return data?.funds.reduce((sum, fund) => sum + Number(fund.current_balance), 0) || 0
  }



  if (loading) {
    return <FullScreenLoader message="Loading dashboard..." />
  }

  if (error) {
    return (
      <Container className="py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error loading dashboard: {error}</AlertDescription>
        </Alert>
      </Container>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground variant="default" />

      <Container className="py-6 space-y-6">
        {/* Header */}
        <Section className="animate-fade-in animate-slide-in-from-top-4 animate-duration-700">
          <div className="flex items-center justify-between flex-col md:flex-row gap-4">
            <div>
              <Heading size="h1" className="flex items-center gap-3">
                <Activity className="h-10 w-10 text-white/80" />
                Church Finance Dashboard
              </Heading>
              <Text size="lg" color="muted" className="mt-2">
                Welcome back, {user?.full_name || user?.email} - Overview of your church finances
              </Text>
            </div>
            {canEdit() && (
              <div className="flex gap-4">
                <Link href="/transactions">
                  <GlassButton variant="default">
                    Add Transaction
                  </GlassButton>
                </Link>
                <Link href="/offerings">
                  <GlassButton variant="default">
                    Record Offering
                  </GlassButton>
                </Link>
              </div>
            )}
          </div>
        </Section>

        {/* Summary Cards */}
        <Grid cols={4} gap="xl" className="animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700" style={{ animationDelay: '800ms' }}>
          <GlassCard hover animation="slideUp">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-white/70">Total Funds</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={getTotalBalance()} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard hover animation="slideUp" style={{ animationDelay: '100ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-white/70">Monthly Income</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={data?.monthlyStats.income || 0} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard hover animation="slideUp" style={{ animationDelay: '200ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-white/70">Monthly Expenses</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={data?.monthlyStats.expenses || 0} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="success" hover animation="slideUp" style={{ animationDelay: '300ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-green-200">Net Income</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold" className="text-green-100">
                <AnimatedCounter value={data?.monthlyStats.netIncome || 0} />
              </Text>
            </GlassCardContent>
          </GlassCard>
        </Grid>

        {/* Fund Balance Cards */}
        <Grid cols={3} gap="xl">
          {data?.funds.map((fund, index) => {
            const balance = Number(fund.current_balance) || 0;
            const income = Number(fund.total_income) || 0;
            const expenses = Number(fund.total_expenses) || 0;
            const offerings = Number(fund.total_offerings) || 0;
            const totalIncome = income + offerings; // Merge offerings into income

            return (
              <GlassCard
                key={fund.id}
                hover
                animation="slideUp"
                className="animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
                style={{ animationDelay: `${1200 + index * 100}ms` }}
              >
                <GlassCardHeader className="pb-3">
                  <GlassCardTitle>{fund.name}</GlassCardTitle>
                  <Text size="2xl" weight="bold">
                    <AnimatedCounter value={balance} />
                  </Text>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  <Grid cols={2} gap="lg">
                    <div className="bg-green-500/20 p-3 rounded-lg backdrop-blur-sm">
                      <Text size="base" weight="medium" className="text-green-300">
                        <AnimatedCounter value={totalIncome} />
                      </Text>
                      <Text size="xs" className="text-green-200/70">Income</Text>
                    </div>
                    <div className="bg-red-500/20 p-3 rounded-lg backdrop-blur-sm">
                      <Text size="base" weight="medium" className="text-red-300">
                        <AnimatedCounter value={expenses} />
                      </Text>
                      <Text size="xs" className="text-red-200/70">Expenses</Text>
                    </div>
                  </Grid>
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </Grid>

        <div className="mobile-grid lg:grid-cols-2">
          {/* Recent Transactions */}
          <GlassCard
            hover
            animation="slideUp"
            className="animate-fade-in animate-slide-in-from-left-mobile animate-duration-700"
            style={{ animationDelay: '1500ms' }}
          >
            <GlassCardHeader className="flex flex-row items-center justify-between">
              <GlassCardTitle>Recent Transactions</GlassCardTitle>
              <Link href="/transactions">
                <GlassButton variant="ghost" size="sm">
                  View All
                </GlassButton>
              </Link>
            </GlassCardHeader>
            <GlassCardContent>
              <GlassTable>
                <GlassTableHeader>
                  <GlassTableRow>
                    <GlassTableHead>Date</GlassTableHead>
                    <GlassTableHead>Description</GlassTableHead>
                    <GlassTableHead>Fund</GlassTableHead>
                    <GlassTableHead>Amount</GlassTableHead>
                  </GlassTableRow>
                </GlassTableHeader>
                <GlassTableBody>
                  {data?.recentTransactions.slice(0, 5).map((transaction) => (
                    <GlassTableRow key={transaction.id}>
                      <GlassTableCell>
                        {formatDate(transaction.transaction_date)}
                      </GlassTableCell>
                      <GlassTableCell>{transaction.description}</GlassTableCell>
                      <GlassTableCell>{transaction.fund?.name}</GlassTableCell>
                      <GlassTableCell
                        numeric
                        className={`font-medium ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                          }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </GlassTableCell>
                    </GlassTableRow>
                  ))}
                </GlassTableBody>
              </GlassTable>
            </GlassCardContent>
          </GlassCard>

          {/* Alerts and Upcoming Items */}
          <div className="space-y-6">
            {/* Upcoming Bills */}
            <GlassCard
              hover
              animation="slideUp"
              className="animate-fade-in animate-slide-in-from-right-mobile animate-duration-700"
              style={{ animationDelay: '1600ms' }}
            >
              <GlassCardHeader className="flex flex-row items-center justify-between">
                <GlassCardTitle>Upcoming Bills</GlassCardTitle>
                <Link href="/bills">
                  <GlassButton variant="ghost" size="sm">
                    View All
                  </GlassButton>
                </Link>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-3">
                  {data?.upcomingBills.slice(0, 5).map((bill) => {
                    const daysUntilDue = Math.ceil(
                      (new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isOverdue = daysUntilDue < 0;
                    const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-all duration-200">
                        <div className="flex-1">
                          <Text weight="medium">{bill.vendor_name}</Text>
                          <Text size="sm" className="text-white/60">
                            Due: {formatDate(bill.due_date)}
                          </Text>
                        </div>
                        <div className="flex items-center gap-3">
                          <Text weight="semibold">
                            {formatCurrency(Number(bill.amount))}
                          </Text>
                          <StatusBadge
                            variant={isOverdue ? 'error' : isDueSoon ? 'warning' : 'success'}
                            size="sm"
                          >
                            {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Upcoming'}
                          </StatusBadge>
                        </div>
                      </div>
                    );
                  })}
                  {data?.upcomingBills.length === 0 && (
                    <Text className="text-center text-white/60 py-8">
                      No upcoming bills
                    </Text>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Outstanding Advances */}
            <GlassCard
              hover
              animation="slideUp"
              className="animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700"
              style={{ animationDelay: '1700ms' }}
            >
              <GlassCardHeader className="flex flex-row items-center justify-between">
                <GlassCardTitle>Outstanding Advances</GlassCardTitle>
                <Link href="/advances">
                  <GlassButton variant="ghost" size="sm">
                    View All
                  </GlassButton>
                </Link>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-3">
                  {data?.outstandingAdvances.slice(0, 5).map((advance) => (
                    <div
                      key={advance.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <Text weight="medium">{advance.recipient_name}</Text>
                        <Text size="sm" className="text-white/60">
                          Issued: {formatDate(advance.created_at)}
                        </Text>
                      </div>
                      <div className="flex items-center gap-3">
                        <Text weight="semibold">
                          {formatCurrency(Number(advance.amount))}
                        </Text>
                        <StatusBadge
                          variant={advance.status === 'outstanding' ? 'warning' : advance.status === 'partial' ? 'secondary' : 'success'}
                          size="sm"
                        >
                          {advance.status}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                  {data?.outstandingAdvances.length === 0 && (
                    <Text className="text-center text-white/60 py-8">
                      No outstanding advances
                    </Text>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </Container>
    </div>
  )
}