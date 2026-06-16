'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { FundSummary } from '@/types/database'

interface ChartTransaction {
  transaction_date: string
  type: string
  amount: number
}

export interface DashboardChartsProps {
  funds: FundSummary[]
  chartTransactions: ChartTransaction[]
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--income))',
  'hsl(var(--expense))',
  'hsl(var(--pending))',
  'hsl(var(--chart-2, var(--primary)))',
  'hsl(var(--chart-3, var(--income)))',
]

function buildMonthlyTrend(transactions: ChartTransaction[]) {
  const monthly: Record<string, { month: string; income: number; expenses: number; net: number }> = {}

  transactions.forEach((t) => {
    const month = new Date(t.transaction_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    })
    if (!monthly[month]) {
      monthly[month] = { month, income: 0, expenses: 0, net: 0 }
    }
    const amount = Number(t.amount)
    if (t.type === 'income') {
      monthly[month].income += amount
    } else {
      monthly[month].expenses += amount
    }
    monthly[month].net = monthly[month].income - monthly[month].expenses
  })

  return Object.values(monthly)
}

export function DashboardChartsInner({ funds, chartTransactions }: DashboardChartsProps) {
  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(chartTransactions),
    [chartTransactions]
  )

  const fundAllocation = useMemo(
    () =>
      funds
        .filter((f) => Number(f.current_balance) > 0)
        .map((f) => ({
          name: f.name,
          value: Number(f.current_balance),
        }))
        .sort((a, b) => b.value - a.value),
    [funds]
  )

  const cashFlow = useMemo(
    () =>
      monthlyTrend.map((m) => ({
        month: m.month,
        inflow: m.income,
        outflow: m.expenses,
        net: m.net,
      })),
    [monthlyTrend]
  )

  const chartTooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
    },
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard hover animation="slideUp">
        <GlassCardHeader>
          <GlassCardTitle>Income vs Expense Trend</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...chartTooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--income))"
                strokeWidth={2}
                name="Income"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--expense))"
                strokeWidth={2}
                name="Expenses"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCardContent>
      </GlassCard>

      <GlassCard hover animation="slideUp">
        <GlassCardHeader>
          <GlassCardTitle>Fund Allocation</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={fundAllocation}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
              >
                {fundAllocation.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCardContent>
      </GlassCard>

      <GlassCard hover animation="slideUp" className="lg:col-span-2">
        <GlassCardHeader>
          <GlassCardTitle>Monthly Cash Flow</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...chartTooltipStyle} />
              <Legend />
              <Bar dataKey="inflow" fill="hsl(var(--income))" name="Inflow" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="hsl(var(--expense))" name="Outflow" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" fill="hsl(var(--primary))" name="Net" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
