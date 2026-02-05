'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Users, Building,
  PieChart as PieChartIcon, BarChart3, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { formatCurrency } from '@/lib/utils'
import type { ReportsData } from '@/types/database'
import type { FilterConfig } from './AdvancedFilters'

interface AdvancedDashboardProps {
  data: ReportsData
  dateRange: { startDate: string; endDate: string }
  filters: FilterConfig
  comparisonData?: ReportsData
}

interface MetricCard {
  title: string
  value: number
  previousValue?: number
  format: 'currency' | 'number' | 'percentage'
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<any>
  color: string
  description?: string
}

export function AdvancedDashboard({ data, dateRange, filters, comparisonData }: AdvancedDashboardProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')
  const [metricPeriod, setMetricPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  // Process data for charts
  const processedData = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expenses: number; offerings: number; bills: number } } = {}

    // Group transactions by month
    data.transactions.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0, offerings: 0, bills: 0 }
      }

      if (transaction.type === 'income') {
        monthlyData[month].income += transaction.amount
      } else {
        monthlyData[month].expenses += transaction.amount
      }
    })

    // Group offerings by month
    data.offerings.forEach(offering => {
      const month = new Date(offering.service_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      })

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0, offerings: 0, bills: 0 }
      }

      monthlyData[month].offerings += offering.amount
    })

    // Group bills by month
    data.bills.forEach(bill => {
      if (bill.status === 'paid') {
        const month = new Date(bill.due_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })

        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0, offerings: 0, bills: 0 }
        }

        monthlyData[month].bills += bill.amount
      }
    })

    return Object.entries(monthlyData)
      .map(([month, values]) => ({
        month,
        ...values,
        net: values.income - values.expenses
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [data])

  // Calculate key metrics
  const metrics = useMemo((): MetricCard[] => {
    const totalIncome = data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalOfferings = data.offerings
      .reduce((sum, o) => sum + o.amount, 0)

    const totalBills = data.bills
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0)

    const netIncome = totalIncome - totalExpenses

    const previousIncome = comparisonData?.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) || 0

    const previousExpenses = comparisonData?.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) || 0

    const previousOfferings = comparisonData?.offerings
      .reduce((sum, o) => sum + o.amount, 0) || 0

    return [
      {
        title: 'Total Income',
        value: totalIncome,
        previousValue: previousIncome,
        format: 'currency',
        trend: totalIncome > previousIncome ? 'up' : totalIncome < previousIncome ? 'down' : 'neutral',
        icon: TrendingUp,
        color: 'text-green-600',
        description: 'All income transactions'
      },
      {
        title: 'Total Expenses',
        value: totalExpenses,
        previousValue: previousExpenses,
        format: 'currency',
        trend: totalExpenses < previousExpenses ? 'up' : totalExpenses > previousExpenses ? 'down' : 'neutral',
        icon: TrendingDown,
        color: 'text-red-600',
        description: 'All expense transactions'
      },
      {
        title: 'Net Income',
        value: netIncome,
        previousValue: previousIncome - previousExpenses,
        format: 'currency',
        trend: netIncome > (previousIncome - previousExpenses) ? 'up' :
          netIncome < (previousIncome - previousExpenses) ? 'down' : 'neutral',
        icon: DollarSign,
        color: netIncome >= 0 ? 'text-green-600' : 'text-red-600',
        description: 'Income minus expenses'
      },
      {
        title: 'Total Offerings',
        value: totalOfferings,
        previousValue: previousOfferings,
        format: 'currency',
        trend: totalOfferings > previousOfferings ? 'up' :
          totalOfferings < previousOfferings ? 'down' : 'neutral',
        icon: Building,
        color: 'text-blue-600',
        description: 'All offering collections'
      },
      {
        title: 'Bills Paid',
        value: totalBills,
        format: 'currency',
        icon: Calendar,
        color: 'text-orange-600',
        description: 'Total paid bills'
      },
      {
        title: 'Active Funds',
        value: data.funds.length,
        format: 'number',
        icon: Users,
        color: 'text-purple-600',
        description: 'Number of fund accounts'
      }
    ]
  }, [data, comparisonData])

  // Fund distribution data for pie chart
  const fundDistribution = useMemo(() => {
    return data.funds
      .filter(fund => (fund.current_balance || 0) > 0)
      .map(fund => ({
        name: fund.name,
        value: fund.current_balance || 0,
        percentage: ((fund.current_balance || 0) / data.funds.reduce((sum, f) => sum + (f.current_balance || 0), 0)) * 100
      }))
      .sort((a, b) => b.value - a.value)
  }, [data.funds])

  // Chart colors
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042']

  const renderChart = () => {
    const chartProps = {
      data: processedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={value => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
            <Line type="monotone" dataKey="offerings" stroke="#3B82F6" strokeWidth={2} name="Offerings" />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={value => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            <Area type="monotone" dataKey="expenses" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
            <Area type="monotone" dataKey="offerings" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
          </AreaChart>
        )
      default:
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={value => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="income" fill="#10B981" name="Income" />
            <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            <Bar dataKey="offerings" fill="#3B82F6" name="Offerings" />
          </BarChart>
        )
    }
  }

  const renderMetricCard = (metric: MetricCard) => {
    const Icon = metric.icon
    const changePercentage = metric.previousValue && metric.previousValue !== 0
      ? ((metric.value - metric.previousValue) / metric.previousValue) * 100
      : 0

    return (
      <Card key={metric.title} className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          <Icon className={`h-4 w-4 ${metric.color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metric.format === 'currency' ? (
              <AnimatedCounter
                value={metric.value}
                prefix="৳"
                suffix=""
              />
            ) : metric.format === 'percentage' ? (
              <AnimatedCounter
                value={Math.round(metric.value * 10) / 10}
                suffix="%"
              />
            ) : (
              <AnimatedCounter value={metric.value} />
            )}
          </div>
          {metric.description && (
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          )}
          {metric.previousValue !== undefined && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {changePercentage > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : changePercentage < 0 ? (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <Activity className="h-3 w-3 text-gray-500 mr-1" />
              )}
              <span className={
                changePercentage > 0 ? 'text-green-600' :
                  changePercentage < 0 ? 'text-red-600' :
                    'text-gray-600'
              }>
                {Math.abs(changePercentage).toFixed(1)}% from previous period
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map(renderMetricCard)}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Financial Trends</TabsTrigger>
          <TabsTrigger value="distribution">Fund Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Trends Over Time</CardTitle>
                  <CardDescription>
                    Track income, expenses, and offerings across the selected period
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Bar Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="line">
                        <div className="flex items-center gap-2">
                          <LineChartIcon className="h-4 w-4" />
                          Line Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="area">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Area Chart
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {renderChart()}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fund Distribution</CardTitle>
                <CardDescription>
                  Current balance distribution across all funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={fundDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }: any) => `${name}: ${(percentage || 0).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {fundDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fund Balances</CardTitle>
                <CardDescription>
                  Detailed breakdown of fund balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fundDistribution.map((fund, index) => {
                    const originalFund = data.funds.find(f => f.name === fund.name);
                    const cash = originalFund?.cash_balance || 0;
                    const bank = originalFund?.bank_balance || 0;

                    return (
                      <div key={fund.name} className="flex flex-col space-y-1 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="text-sm font-medium">{fund.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{formatCurrency(fund.value)}</div>
                            <div className="text-xs text-muted-foreground">{fund.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs pl-5 pr-1 text-muted-foreground/80">
                          <span>Cash: {formatCurrency(cash)}</span>
                          <span>Bank: {formatCurrency(bank)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Period Comparison</CardTitle>
              <CardDescription>
                Compare current period with previous period metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparisonData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Comparison metrics will be rendered here */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        data.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Income</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        data.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Expenses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        data.offerings.reduce((sum, o) => sum + o.amount, 0)
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Offerings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {data.funds.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Funds</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No comparison data available. Select a different date range to enable comparisons.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}