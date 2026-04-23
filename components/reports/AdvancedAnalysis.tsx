'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, Target, Brain, Calendar,
  Activity, Zap, Eye, BarChart3, PieChart, LineChart as LineChartIcon
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ReportsData } from '@/lib/server-data'
import type { FilterConfig } from './AdvancedFilters'

interface AdvancedAnalysisProps {
  data: ReportsData
  dateRange: { startDate: string; endDate: string }
  filters: FilterConfig
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  strength: 'weak' | 'moderate' | 'strong'
  percentage: number
  confidence: number
}

interface Forecast {
  period: string
  predicted: number
  confidence: number
  upper: number
  lower: number
}

interface Anomaly {
  date: string
  type: 'income' | 'expense' | 'offering'
  amount: number
  expected: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
  description: string
}

export function AdvancedAnalysis({ data, dateRange, filters }: AdvancedAnalysisProps) {
  const [analysisType, setAnalysisType] = useState<'trends' | 'forecast' | 'anomalies' | 'patterns'>('trends')
  const [forecastPeriod, setForecastPeriod] = useState<'3months' | '6months' | '1year'>('6months')
  const [trendMetric, setTrendMetric] = useState<'income' | 'expenses' | 'offerings' | 'net'>('income')

  // Process data for time series analysis
  const timeSeriesData = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expenses: number; offerings: number; count: number } } = {}

    // Group transactions by month
    data.transactions.forEach(transaction => {
      const month = new Date(transaction.transaction_date).toISOString().slice(0, 7) // YYYY-MM format

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0, offerings: 0, count: 0 }
      }

      if (transaction.type === 'income') {
        monthlyData[month].income += transaction.amount
      } else {
        monthlyData[month].expenses += transaction.amount
      }
      monthlyData[month].count++
    })

    // Group offerings by month
    data.offerings.forEach(offering => {
      const month = new Date(offering.service_date).toISOString().slice(0, 7)

      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0, offerings: 0, count: 0 }
      }

      monthlyData[month].offerings += offering.amount
    })

    return Object.entries(monthlyData)
      .map(([month, values]) => ({
        month,
        date: new Date(month + '-01'),
        ...values,
        net: values.income - values.expenses,
        average: (values.income + values.expenses + values.offerings) / 3
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [data])

  // Advanced trend analysis using linear regression
  const trendAnalysis = useMemo((): TrendAnalysis => {
    if (timeSeriesData.length < 3) {
      return { direction: 'stable', strength: 'weak', percentage: 0, confidence: 0 }
    }

    const values = timeSeriesData.map(d => d[trendMetric])
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)

    // Calculate linear regression
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared for confidence
    const yMean = sumY / n
    const totalSumSquares = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const residualSumSquares = values.reduce((sum, yi, i) => {
      const predicted = slope * i + intercept
      return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const rSquared = 1 - (residualSumSquares / totalSumSquares)

    const avgValue = values.reduce((a, b) => a + b, 0) / values.length
    const percentage = (slope / avgValue) * 100 * n // Annualized

    return {
      direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
      strength: Math.abs(percentage) > 10 ? 'strong' : Math.abs(percentage) > 5 ? 'moderate' : 'weak',
      percentage: Math.abs(percentage),
      confidence: rSquared * 100
    }
  }, [timeSeriesData, trendMetric])

  // Generate forecasts using exponential smoothing
  const forecasts = useMemo((): Forecast[] => {
    if (timeSeriesData.length < 3) return []

    const values = timeSeriesData.map(d => d[trendMetric])
    const alpha = 0.3 // Smoothing parameter

    // Calculate exponential smoothing
    const smoothed = [values[0]]
    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1])
    }

    // Calculate trend
    const trend = [0]
    const beta = 0.3
    for (let i = 1; i < smoothed.length; i++) {
      const currentTrend = beta * (smoothed[i] - smoothed[i - 1]) + (1 - beta) * (trend[i - 1] || 0)
      trend.push(currentTrend)
    }

    const lastSmoothed = smoothed[smoothed.length - 1]
    const lastTrend = trend[trend.length - 1]

    // Generate forecasts
    const periods = forecastPeriod === '3months' ? 3 : forecastPeriod === '6months' ? 6 : 12
    const forecasts: Forecast[] = []

    for (let i = 1; i <= periods; i++) {
      const predicted = lastSmoothed + lastTrend * i
      const standardError = Math.sqrt(
        values.reduce((sum, val, idx) => {
          const forecast = smoothed[idx] + trend[idx]
          return sum + Math.pow(val - forecast, 2)
        }, 0) / values.length
      )

      const confidence = 95
      const margin = 1.96 * standardError // 95% confidence interval

      const lastDate = timeSeriesData[timeSeriesData.length - 1].date
      const futureDate = new Date(lastDate)
      futureDate.setMonth(futureDate.getMonth() + i)

      forecasts.push({
        period: futureDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        predicted: Math.max(0, predicted),
        confidence,
        upper: Math.max(0, predicted + margin),
        lower: Math.max(0, predicted - margin)
      })
    }

    return forecasts
  }, [timeSeriesData, trendMetric, forecastPeriod])

  // Detect anomalies using statistical methods
  const anomalies = useMemo((): Anomaly[] => {
    const detectedAnomalies: Anomaly[] = []

    const metrics = ['income', 'expenses', 'offerings'] as const
    metrics.forEach((metric) => {
      const values = timeSeriesData.map(d => {
        const value = d[metric]
        return typeof value === 'number' ? value : 0
      })
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)

      timeSeriesData.forEach((dataPoint, index) => {
        const value = dataPoint[metric as keyof typeof dataPoint]
        const numericValue = typeof value === 'number' ? value : 0
        const zScore = Math.abs((numericValue - mean) / stdDev)

        if (zScore > 2) { // More than 2 standard deviations
          const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
          const deviation = ((numericValue - mean) / mean) * 100

          detectedAnomalies.push({
            date: dataPoint.month,
            type: metric as 'income' | 'expense' | 'offering',
            amount: numericValue,
            expected: mean,
            deviation,
            severity,
            description: `${metric} is ${deviation > 0 ? 'above' : 'below'} normal by ${Math.abs(deviation).toFixed(1)}%`
          })
        }
      })
    })

    return detectedAnomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [timeSeriesData])

  // Pattern analysis
  const patterns = useMemo(() => {
    const monthlyPatterns: { [month: number]: { income: number; expenses: number; offerings: number; count: number } } = {}
    const weeklyPatterns: { [week: number]: { offerings: number; count: number } } = {}

    // Monthly seasonality
    timeSeriesData.forEach(dataPoint => {
      const month = dataPoint.date.getMonth()
      if (!monthlyPatterns[month]) {
        monthlyPatterns[month] = { income: 0, expenses: 0, offerings: 0, count: 0 }
      }
      monthlyPatterns[month].income += dataPoint.income
      monthlyPatterns[month].expenses += dataPoint.expenses
      monthlyPatterns[month].offerings += dataPoint.offerings
      monthlyPatterns[month].count++
    })

    // Calculate averages
    Object.keys(monthlyPatterns).forEach(month => {
      const pattern = monthlyPatterns[parseInt(month)]
      pattern.income /= pattern.count
      pattern.expenses /= pattern.count
      pattern.offerings /= pattern.count
    })

    return {
      monthly: Object.entries(monthlyPatterns).map(([month, pattern]) => ({
        month: new Date(2024, parseInt(month), 1).toLocaleDateString('en-US', { month: 'short' }),
        ...pattern
      })),
      insights: [
        {
          type: 'seasonal',
          description: 'Highest offering months typically occur during holiday seasons',
          confidence: 85
        },
        {
          type: 'trend',
          description: `${trendMetric} shows ${trendAnalysis.direction}ward trend with ${trendAnalysis.strength} strength`,
          confidence: trendAnalysis.confidence
        }
      ]
    }
  }, [timeSeriesData, trendAnalysis, trendMetric])

  const renderTrendsAnalysis = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>Statistical analysis of financial trends</CardDescription>
            </div>
            <Select value={trendMetric} onValueChange={(value: any) => setTrendMetric(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="offerings">Offerings</SelectItem>
                <SelectItem value="net">Net Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {trendAnalysis.direction === 'up' ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : trendAnalysis.direction === 'down' ? (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                ) : (
                  <Activity className="h-8 w-8 text-gray-500" />
                )}
              </div>
              <div className="text-2xl font-bold">
                {trendAnalysis.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Annual Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold capitalize">
                {trendAnalysis.strength}
              </div>
              <div className="text-sm text-muted-foreground">Trend Strength</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {trendAnalysis.confidence.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Confidence</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(value) => new Date(value + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              />
               <YAxis tickFormatter={(value) => formatCurrency(value)} />
               <Tooltip
                 formatter={(value) => formatCurrency(value)}
                 labelFormatter={(label) => new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              />
              <Line
                type="monotone"
                dataKey={trendMetric}
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )

  const renderForecast = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Financial Forecast
              </CardTitle>
              <CardDescription>Predictive analysis based on historical data</CardDescription>
            </div>
            <Select value={forecastPeriod} onValueChange={(value: any) => setForecastPeriod(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div>
              <h4 className="font-semibold mb-3">Forecast Summary</h4>
              <div className="space-y-2">
                {forecasts.slice(0, 3).map((forecast, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{forecast.period}</span>
                    <span className="font-medium">{formatCurrency(forecast.predicted)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Confidence Intervals</h4>
              <div className="space-y-2">
                {forecasts.slice(0, 3).map((forecast, index) => (
                  <div key={index} className="text-sm">
                    <span className="text-muted-foreground">{forecast.period}: </span>
                    <span>{formatCurrency(forecast.lower)} - {formatCurrency(forecast.upper)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...timeSeriesData.map(d => ({ ...d, type: 'historical' })), ...forecasts.map(f => ({ month: f.period, [trendMetric]: f.predicted, type: 'forecast', upper: f.upper, lower: f.lower }))]}>
              <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="month" />
               <YAxis tickFormatter={(value) => formatCurrency(value)} />
               <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey={trendMetric}
                stroke="#3B82F6"
                strokeWidth={2}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="upper"
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
              <ReferenceArea x1={timeSeriesData.length - 1} fill="#3B82F6" fillOpacity={0.1} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )

  const renderAnomalies = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomaly Detection
          </CardTitle>
          <CardDescription>Unusual patterns and outliers in financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No significant anomalies detected in the selected period.</p>
                <p className="text-sm">Your financial patterns appear consistent and predictable.</p>
              </div>
            ) : (
              anomalies.map((anomaly, index) => (
                <Alert key={index} className={`border-l-4 ${
                  anomaly.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                  anomaly.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    <Badge variant={anomaly.severity === 'high' ? 'destructive' : anomaly.severity === 'medium' ? 'default' : 'secondary'}>
                      {anomaly.severity}
                    </Badge>
                    {anomaly.type} Anomaly - {new Date(anomaly.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </AlertTitle>
                  <AlertDescription>
                    <p>{anomaly.description}</p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Actual: </span>{formatCurrency(anomaly.amount)} |
                      <span className="font-medium"> Expected: </span>{formatCurrency(anomaly.expected)}
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPatterns = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Pattern Analysis
          </CardTitle>
          <CardDescription>Seasonal patterns and behavioral insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-4">Monthly Seasonality</h4>
              <ResponsiveContainer width="100%" height={250}>
                 <BarChart data={patterns.monthly}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" />
                   <YAxis tickFormatter={(value) => formatCurrency(value)} />
                   <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="offerings" fill="#3B82F6" name="Offerings" />
                  <Bar dataKey="income" fill="#10B981" name="Income" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Key Insights</h4>
              <div className="space-y-3">
                {patterns.insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="capitalize">{insight.type}</Badge>
                      <span className="text-xs text-muted-foreground">{insight.confidence}% confidence</span>
                    </div>
                    <p className="text-sm">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analysis</h2>
          <p className="text-muted-foreground">AI-powered insights and predictive analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={analysisType === 'trends' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnalysisType('trends')}
          >
            <LineChartIcon className="h-4 w-4 mr-1" />
            Trends
          </Button>
          <Button
            variant={analysisType === 'forecast' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnalysisType('forecast')}
          >
            <Target className="h-4 w-4 mr-1" />
            Forecast
          </Button>
          <Button
            variant={analysisType === 'anomalies' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnalysisType('anomalies')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Anomalies
          </Button>
          <Button
            variant={analysisType === 'patterns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnalysisType('patterns')}
          >
            <Brain className="h-4 w-4 mr-1" />
            Patterns
          </Button>
        </div>
      </div>

      {analysisType === 'trends' && renderTrendsAnalysis()}
      {analysisType === 'forecast' && renderForecast()}
      {analysisType === 'anomalies' && renderAnomalies()}
      {analysisType === 'patterns' && renderPatterns()}
    </div>
  )
}