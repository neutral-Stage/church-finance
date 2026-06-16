'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import type { AuthUser } from '@/types/database'

import { AnimatedCounter } from '@/components/ui/animated-counter'
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
  StatusBadge,
  Heading,
  Text,
  Container,
  Grid,
  Section
} from '@/components/ui'
import {
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { DashboardData } from '@/lib/server-data'
import { refreshDashboardData, fetchChartTransactions } from '@/lib/dashboard-refresh'
import { DashboardCharts } from '@/components/dashboard-charts'
import { BudgetVsActual } from '@/components/budget-vs-actual'

interface DashboardClientProps {
  initialData: DashboardData
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canApprove: boolean
    userRole: string | null
  }
  serverUser: AuthUser
}

export function DashboardClient({ initialData, permissions, serverUser }: DashboardClientProps): JSX.Element {
  const [data, setData] = useState<DashboardData>(initialData)
  const [chartTransactions, setChartTransactions] = useState<
    { transaction_date: string; type: string; amount: number; fund_id?: string }[]
  >([])
  const { user, setServerUser } = useAuth()
  const { selectedChurch } = useChurch()

  const hasSetServerUser = useRef(false)

  useEffect(() => {
    if (serverUser && (!user || user.id !== serverUser.id) && !hasSetServerUser.current) {
      setServerUser(serverUser)
      hasSetServerUser.current = true
    }
  }, [serverUser, user, setServerUser])

  const reloadDashboard = useCallback(async () => {
    if (!selectedChurch?.id) return
    const refreshed = await refreshDashboardData(selectedChurch.id)
    if (refreshed) setData(refreshed)
    const txns = await fetchChartTransactions(selectedChurch.id)
    setChartTransactions(txns)
  }, [selectedChurch?.id])

  useEffect(() => {
    if (selectedChurch?.id) {
      void fetchChartTransactions(selectedChurch.id).then(setChartTransactions)
    }
  }, [selectedChurch?.id])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !selectedChurch?.id) {
      return
    }

    const channel = supabase
      .channel(`dashboard_${selectedChurch.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funds', filter: `church_id=eq.${selectedChurch.id}` }, () => {
        void reloadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `church_id=eq.${selectedChurch.id}` }, () => {
        void reloadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `church_id=eq.${selectedChurch.id}` }, () => {
        void reloadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advances', filter: `church_id=eq.${selectedChurch.id}` }, () => {
        void reloadDashboard()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [selectedChurch?.id, reloadDashboard])

  const getTotalBalance = () => {
    return data.funds.reduce((sum, fund) => sum + Number(fund.current_balance), 0) || 0
  }

  const userRole = permissions.userRole ?? 'viewer'
  const isViewer = userRole === 'viewer'
  const isTreasurer = userRole === 'treasurer'
  const isAdmin = userRole === 'admin'

  const pendingBillsCount = data.upcomingBills.filter(
    (b) => b.approval_status === 'pending' || (!b.approval_status && b.status === 'pending')
  ).length
  const outstandingAdvancesCount = data.outstandingAdvances.length
  const churchHealth =
    pendingBillsCount > 0 || outstandingAdvancesCount > 0
      ? 'attention'
      : data.monthlyStats.netIncome >= 0
        ? 'healthy'
        : 'caution'

  return (
    <div className="min-h-screen bg-background">
      <Container className="py-6 space-y-6">
        {/* Header */}
        <Section className="animate-fade-in animate-slide-in-from-top-4 animate-duration-700">
          <div className="flex items-center justify-between flex-col md:flex-row gap-4">
            <div>
              <Heading size="h1" className="flex items-center gap-3">
                <Activity className="h-10 w-10 text-muted-foreground" />
                Church Finance Dashboard
              </Heading>
              <Text size="lg" color="muted" className="mt-2">
                Welcome back, {(user || serverUser)?.full_name || (user || serverUser)?.email} - Overview of your church finances
              </Text>
            </div>
            {permissions.canEdit && !isViewer && (
              <div className="flex gap-4 flex-wrap">
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
                {(isTreasurer || isAdmin) && (
                  <Link href="/approvals">
                    <GlassButton variant="outline">
                      Approvals
                    </GlassButton>
                  </Link>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Summary Cards */}
        <Grid cols={4} gap="xl" className="animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700" style={{ animationDelay: '800ms' }}>
          <GlassCard hover animation="slideUp">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-muted-foreground">Total Funds</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={getTotalBalance()} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard hover animation="slideUp" style={{ animationDelay: '100ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-muted-foreground">Monthly Income</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={data.monthlyStats.income} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard hover animation="slideUp" style={{ animationDelay: '200ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-muted-foreground">Monthly Expenses</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={data.monthlyStats.expenses} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="success" hover animation="slideUp" style={{ animationDelay: '300ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-income">Net Income</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold" className="text-income">
                <AnimatedCounter value={data.monthlyStats.netIncome} />
              </Text>
            </GlassCardContent>
          </GlassCard>
        </Grid>

        {isAdmin && (
          <GlassCard hover animation="slideUp" className="border-primary/20">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Platform Health
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  {churchHealth === 'healthy' ? (
                    <CheckCircle2 className="h-8 w-8 text-income shrink-0" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-pending shrink-0" />
                  )}
                  <div>
                    <Text weight="semibold" className="capitalize">
                      {churchHealth === 'healthy' ? 'Church finances look healthy' : 'Items need attention'}
                    </Text>
                    <Text size="sm" color="muted">
                      {pendingBillsCount} pending bill approvals · {outstandingAdvancesCount} outstanding advances
                    </Text>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href="/approvals">
                    <GlassButton variant="outline" size="sm">
                      Review approvals
                    </GlassButton>
                  </Link>
                  <Link href="/admin/churches">
                    <GlassButton variant="ghost" size="sm">
                      Admin console
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {!isViewer && (
        <Grid cols={3} gap="xl">
          {data.funds.map((fund, index) => {
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
                    <div className="bg-income/15 border border-income/30 p-3 rounded-lg">
                      <Text size="base" weight="medium" className="text-income">
                        <AnimatedCounter value={totalIncome} />
                      </Text>
                      <Text size="xs" className="text-muted-foreground">Income</Text>
                    </div>
                    <div className="bg-expense/15 border border-expense/30 p-3 rounded-lg">
                      <Text size="base" weight="medium" className="text-expense">
                        <AnimatedCounter value={expenses} />
                      </Text>
                      <Text size="xs" className="text-muted-foreground">Expenses</Text>
                    </div>
                  </Grid>
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </Grid>
        )}

        {!isViewer && (
          <>
        <DashboardCharts funds={data.funds} chartTransactions={chartTransactions} />

        <BudgetVsActual compact />
          </>
        )}

        {!isViewer && (
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
                  {data.recentTransactions.slice(0, 5).map((transaction) => (
                    <GlassTableRow key={transaction.id}>
                      <GlassTableCell>
                        {formatDate(transaction.transaction_date)}
                      </GlassTableCell>
                      <GlassTableCell>{transaction.description}</GlassTableCell>
                      <GlassTableCell>{transaction.fund?.name}</GlassTableCell>
                      <GlassTableCell
                        numeric
                        className={`font-medium ${transaction.type === 'income' ? 'text-income' : 'text-expense'
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
                  {data.upcomingBills.slice(0, 5).map((bill) => {
                    const daysUntilDue = Math.ceil(
                      (new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isOverdue = daysUntilDue < 0;
                    const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-accent transition-all duration-200">
                        <div className="flex-1">
                          <Text weight="medium">{bill.vendor_name}</Text>
                          <Text size="sm" className="text-muted-foreground">
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
                  {data.upcomingBills.length === 0 && (
                    <Text className="text-center text-muted-foreground py-8">
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
                  {data.outstandingAdvances.slice(0, 5).map((advance) => (
                    <div
                      key={advance.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-accent transition-all duration-200"
                    >
                      <div className="flex-1">
                        <Text weight="medium">{advance.recipient_name}</Text>
                        <Text size="sm" className="text-muted-foreground">
                          Issued: {advance.created_at ? formatDate(advance.created_at) : 'Unknown'}
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
                  {data.outstandingAdvances.length === 0 && (
                    <Text className="text-center text-muted-foreground py-8">
                      No outstanding advances
                    </Text>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
        )}
      </Container>
    </div>
  )
}
