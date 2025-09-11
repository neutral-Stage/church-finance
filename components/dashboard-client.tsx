'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
  AnimatedBackground,
  StatusBadge,
  Heading,
  Text,
  Container,
  Grid,
  Section
} from '@/components/ui'
import {
  Activity,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { DashboardData } from '@/lib/server-data'

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
  const [data] = useState<DashboardData>(initialData)
  const { user, setServerUser } = useAuth()

  // Initialize client-side auth state with server user data on mount
  // Use useRef to track if we've already set the server user to prevent infinite loops
  const hasSetServerUser = useRef(false)
  
  useEffect(() => {
    if (serverUser && (!user || user.id !== serverUser.id) && !hasSetServerUser.current) {
      setServerUser(serverUser)
      hasSetServerUser.current = true
    }
  }, [serverUser, user, setServerUser])

  // Set up real-time subscriptions only for updates, not initial loading
  useEffect(() => {
    const fundsSubscription = supabase
      .channel('funds_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funds' }, () => {
        // Instead of full page reload, we could implement targeted updates here
        // For now, we'll disable automatic reloads to prevent infinite loops
        console.log('Funds data changed - manual refresh may be needed')
      })
      .subscribe()

    const transactionsSubscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        console.log('Transactions data changed - manual refresh may be needed')
      })
      .subscribe()

    return () => {
      fundsSubscription.unsubscribe()
      transactionsSubscription.unsubscribe()
    }
  }, [])

  const getTotalBalance = () => {
    return data.funds.reduce((sum, fund) => sum + Number(fund.current_balance), 0) || 0
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
                Welcome back, {(user || serverUser)?.full_name || (user || serverUser)?.email} - Overview of your church finances
              </Text>
            </div>
            {permissions.canEdit && (
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
                <AnimatedCounter value={data.monthlyStats.income} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard hover animation="slideUp" style={{ animationDelay: '200ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-white/70">Monthly Expenses</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold">
                <AnimatedCounter value={data.monthlyStats.expenses} />
              </Text>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="success" hover animation="slideUp" style={{ animationDelay: '300ms' }}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-green-200">Net Income</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <Text size="2xl" weight="bold" className="text-green-100">
                <AnimatedCounter value={data.monthlyStats.netIncome} />
              </Text>
            </GlassCardContent>
          </GlassCard>
        </Grid>

        {/* Fund Balance Cards */}
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
                  {data.recentTransactions.slice(0, 5).map((transaction) => (
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
                  {data.upcomingBills.slice(0, 5).map((bill) => {
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
                  {data.upcomingBills.length === 0 && (
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
                  {data.outstandingAdvances.slice(0, 5).map((advance) => (
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
                  {data.outstandingAdvances.length === 0 && (
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