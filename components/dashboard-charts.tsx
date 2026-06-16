'use client'

import { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { FundSummary } from '@/types/database'

interface ChartTransaction {
  transaction_date: string
  type: string
  amount: number
}

interface DashboardChartsProps {
  funds: FundSummary[]
  chartTransactions: ChartTransaction[]
}

type DateRangePreset = '30d' | '90d' | 'ytd' | '12m' | 'custom'

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--income))',
  'hsl(var(--expense))',
  'hsl(var(--pending))',
  'hsl(var(--chart-2, var(--primary)))',
  'hsl(var(--chart-3, var(--income)))',
]

function getPresetRange(preset: DateRangePreset): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)

  switch (preset) {
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    case 'ytd':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    case '12m':
      start.setFullYear(start.getFullYear() - 1)
      break
    default:
      start.setMonth(start.getMonth() - 6)
  }

  start.setHours(0, 0, 0, 0)
  return { start, end }
}

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

export function DashboardCharts({ funds, chartTransactions }: DashboardChartsProps) {
  const [preset, setPreset] = useState<DateRangePreset>('90d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const filteredTransactions = useMemo(() => {
    let start: Date
    let end: Date

    if (preset === 'custom' && customStart && customEnd) {
      start = new Date(customStart)
      end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
    } else if (preset !== 'custom') {
      ;({ start, end } = getPresetRange(preset))
    } else {
      return chartTransactions
    }

    return chartTransactions.filter((t) => {
      const d = new Date(t.transaction_date)
      return d >= start && d <= end
    })
  }, [chartTransactions, preset, customStart, customEnd])

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(filteredTransactions),
    [filteredTransactions]
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

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
    { id: 'ytd', label: 'YTD' },
    { id: '12m', label: '12 months' },
    { id: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Financial Charts</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTransactions.length} transactions in selected range
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {presets.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? 'default' : 'outline'}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border border-border bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor="chart-start" className="text-xs">
              Start date
            </Label>
            <Input
              id="chart-start"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="chart-end" className="text-xs">
              End date
            </Label>
            <Input
              id="chart-end"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      )}

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
    </div>
  )
}
