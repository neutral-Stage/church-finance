'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useChurch } from '@/contexts/ChurchContext'
import { supabase } from '@/lib/supabase'
import type { ReportsData } from '@/lib/server-data'

interface BudgetRow {
  id: string
  category: string
  fund_id: string | null
  year: number
  month: number | null
  amount: number
}

interface BudgetVsActualProps {
  reportData?: ReportsData
  compact?: boolean
}

export function BudgetVsActual({ reportData, compact = false }: BudgetVsActualProps) {
  const { selectedChurch } = useChurch()
  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [expenseTransactions, setExpenseTransactions] = useState<
    { category: string | null; amount: number }[]
  >([])
  const [loading, setLoading] = useState(true)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!selectedChurch?.id) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [budgetRes, txnRes] = await Promise.all([
          fetch(`/api/budgets?church_id=${selectedChurch.id}&year=${currentYear}`),
          reportData
            ? Promise.resolve(null)
            : supabase
                .from('transactions')
                .select('category, amount, type, transaction_date')
                .eq('church_id', selectedChurch.id)
                .eq('type', 'expense')
                .gte('transaction_date', `${currentYear}-01-01`)
                .lte('transaction_date', `${currentYear}-12-31`),
        ])

        if (budgetRes.ok) {
          const json = await budgetRes.json()
          setBudgets(json.budgets || [])
        }

        if (reportData) {
          setExpenseTransactions(
            reportData.transactions
              .filter((t) => t.type === 'expense')
              .map((t) => ({ category: t.category, amount: Number(t.amount) }))
          )
        } else if (txnRes && !txnRes.error) {
          setExpenseTransactions(txnRes.data || [])
        }
      } catch {
        // Budget table may not exist yet — show empty state gracefully
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [selectedChurch?.id, currentYear, reportData])

  const chartData = useMemo(() => {
    const actualByCategory: Record<string, number> = {}
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'General'
      actualByCategory[cat] = (actualByCategory[cat] || 0) + Number(t.amount)
    })

    const budgetByCategory: Record<string, number> = {}
    budgets.forEach((b) => {
      budgetByCategory[b.category] = (budgetByCategory[b.category] || 0) + Number(b.amount)
    })

    const categories = new Set([
      ...Object.keys(actualByCategory),
      ...Object.keys(budgetByCategory),
    ])

    return Array.from(categories).map((category) => ({
      category,
      budget: budgetByCategory[category] || 0,
      actual: actualByCategory[category] || 0,
      variance: (budgetByCategory[category] || 0) - (actualByCategory[category] || 0),
    }))
  }, [budgets, expenseTransactions])

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
    },
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading budget data...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? '' : 'animate-slide-in-from-bottom-4'}>
      <CardHeader>
        <CardTitle>Budget vs Actual ({currentYear})</CardTitle>
        <CardDescription>
          Compare planned budgets against actual expenses by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No budget or expense data yet. Add budgets via the API or run the migration.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={compact ? 240 : 320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={100}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} {...tooltipStyle} />
              <Legend />
              <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual" fill="hsl(var(--expense))" name="Actual" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
