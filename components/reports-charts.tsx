'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { ReportsData } from '@/lib/server-data'

interface ReportsChartsProps {
  reportData: ReportsData
}

export function ReportsCharts({ reportData }: ReportsChartsProps) {
  const monthlyData = useMemo(() => {
    const monthly: Record<string, { month: string; income: number; expenses: number; offerings: number }> = {}

    reportData.transactions.forEach((t) => {
      const month = new Date(t.transaction_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      })
      if (!monthly[month]) monthly[month] = { month, income: 0, expenses: 0, offerings: 0 }
      if (t.type === 'income') monthly[month].income += Number(t.amount)
      else monthly[month].expenses += Number(t.amount)
    })

    reportData.offerings.forEach((o) => {
      const month = new Date(o.service_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      })
      if (!monthly[month]) monthly[month] = { month, income: 0, expenses: 0, offerings: 0 }
      monthly[month].offerings += Number(o.amount)
    })

    return Object.values(monthly)
  }, [reportData])

  const fundData = useMemo(
    () =>
      reportData.funds
        .filter((f) => (f.current_balance || 0) > 0)
        .map((f) => ({ name: f.name, balance: f.current_balance || 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8),
    [reportData.funds]
  )

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
    },
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expense Trend</CardTitle>
          <CardDescription>Monthly transaction totals for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="hsl(var(--income))" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="hsl(var(--expense))" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="offerings" stroke="hsl(var(--primary))" strokeWidth={2} name="Offerings" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fund Balances</CardTitle>
          <CardDescription>Current allocation across active funds</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fundData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...tooltipStyle} />
              <Bar dataKey="balance" fill="hsl(var(--primary))" name="Balance" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
