'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, FileText, Filter, Calendar, Settings, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { FullScreenLoader } from '@/components/ui/loader'
import { AdvancedDashboard } from '@/components/reports/AdvancedDashboard'
import { AdvancedFilters, type FilterConfig } from '@/components/reports/AdvancedFilters'
import { ReportExporter } from '@/components/reports/ReportExporter'
import { AdvancedAnalysis } from '@/components/reports/AdvancedAnalysis'
import { ReportSettings } from '@/components/reports/ReportSettings'
import type { ReportsData } from '@/lib/server-data'

interface AdvancedReportsClientProps {
  initialData: ReportsData
  initialDateRange: { startDate: string; endDate: string }
}

export default function AdvancedReportsClient({ initialData, initialDateRange }: AdvancedReportsClientProps) {
  const { user } = useAuth()
  const { selectedChurch } = useChurch()
  const [reportData, setReportData] = useState<ReportsData>(initialData)
  const [comparisonData, setComparisonData] = useState<ReportsData | undefined>()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({
    dateRange: {
      startDate: initialDateRange.startDate,
      endDate: initialDateRange.endDate,
      preset: 'month'
    },
    transactionFilters: {
      types: [],
      categories: [],
      fundIds: [],
      paymentMethods: [],
      amountRange: { min: null, max: null }
    },
    offeringFilters: {
      types: [],
      amountRange: { min: null, max: null }
    },
    billFilters: {
      statuses: [],
      categories: [],
      vendorNames: [],
      fundIds: [],
      overdue: false
    },
    advanceFilters: {
      statuses: [],
      recipients: [],
      overdue: false
    },
    fundFilters: {
      fundIds: [],
      balanceRange: { min: null, max: null }
    }
  })

  // Available filter options
  const [availableCategories, setAvailableCategories] = useState({
    transaction: [] as string[],
    offering: [] as string[],
    bill: [] as string[]
  })
  const [availableVendors, setAvailableVendors] = useState<string[]>([])
  const [availableRecipients, setAvailableRecipients] = useState<string[]>([])

  const fetchReportData = useCallback(async (dateRange: { startDate: string; endDate: string }) => {
    if (!selectedChurch) {
      setReportData({ transactions: [], offerings: [], bills: [], advances: [], funds: [] })
      return
    }

    try {
      setLoading(true)

      const [transactionsResult, offeringsResult, billsResult, advancesResult, fundsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            fund:funds(*)
          `)
          .eq('church_id', selectedChurch.id)
          .gte('transaction_date', dateRange.startDate)
          .lte('transaction_date', dateRange.endDate)
          .order('transaction_date', { ascending: false }),

        supabase
          .from('offerings')
          .select('*')
          .eq('church_id', selectedChurch.id)
          .gte('service_date', dateRange.startDate)
          .lte('service_date', dateRange.endDate)
          .order('service_date', { ascending: false }),

        supabase
          .from('bills')
          .select(`
            *,
            fund:funds(*)
          `)
          .eq('church_id', selectedChurch.id)
          .gte('due_date', dateRange.startDate)
          .lte('due_date', dateRange.endDate)
          .order('due_date', { ascending: false }),

        supabase
          .from('advances')
          .select(`
            *,
            fund:funds(*)
          `)
          .eq('church_id', selectedChurch.id)
          .gte('created_at', dateRange.startDate)
          .lte('created_at', dateRange.endDate)
          .order('created_at', { ascending: false }),

        supabase
          .from('funds')
          .select('*')
          .eq('church_id', selectedChurch.id)
          .order('name')
      ])

      if (transactionsResult.error) throw transactionsResult.error
      if (offeringsResult.error) throw offeringsResult.error
      if (billsResult.error) throw billsResult.error
      if (advancesResult.error) throw advancesResult.error
      if (fundsResult.error) throw fundsResult.error

      const newData = {
        transactions: transactionsResult.data || [],
        offerings: offeringsResult.data || [],
        bills: billsResult.data || [],
        advances: advancesResult.data || [],
        funds: fundsResult.data || []
      }

      setReportData(newData)

      // Extract available categories and vendors for filters
      const transactionCategories = [...new Set(newData.transactions.map(t => t.category).filter(Boolean))]
      const offeringTypes = [...new Set(newData.offerings.map(o => o.type).filter(Boolean))]
      const billCategories = [...new Set(newData.bills.map(b => b.category).filter(Boolean))]
      const vendors = [...new Set(newData.bills.map(b => b.vendor_name).filter(Boolean))]
      const recipients = [...new Set(newData.advances.map(a => a.recipient_name).filter(Boolean))]

      setAvailableCategories({
        transaction: transactionCategories,
        offering: offeringTypes,
        bill: billCategories
      })
      setAvailableVendors(vendors)
      setAvailableRecipients(recipients)

    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  const fetchComparisonData = useCallback(async (dateRange: { startDate: string; endDate: string }) => {
    if (!selectedChurch) return

    try {
      // Calculate previous period dates
      const currentStart = new Date(dateRange.startDate)
      const currentEnd = new Date(dateRange.endDate)
      const periodLength = currentEnd.getTime() - currentStart.getTime()

      const previousEnd = new Date(currentStart.getTime() - 1)
      const previousStart = new Date(previousEnd.getTime() - periodLength)

      const [transactionsResult, offeringsResult, billsResult, advancesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select(`*`)
          .eq('church_id', selectedChurch.id)
          .gte('transaction_date', previousStart.toISOString().split('T')[0])
          .lte('transaction_date', previousEnd.toISOString().split('T')[0]),

        supabase
          .from('offerings')
          .select('*')
          .eq('church_id', selectedChurch.id)
          .gte('service_date', previousStart.toISOString().split('T')[0])
          .lte('service_date', previousEnd.toISOString().split('T')[0]),

        supabase
          .from('bills')
          .select('*')
          .eq('church_id', selectedChurch.id)
          .gte('due_date', previousStart.toISOString().split('T')[0])
          .lte('due_date', previousEnd.toISOString().split('T')[0]),

        supabase
          .from('advances')
          .select('*')
          .eq('church_id', selectedChurch.id)
          .gte('created_at', previousStart.toISOString().split('T')[0])
          .lte('created_at', previousEnd.toISOString().split('T')[0])
      ])

      if (!transactionsResult.error && !offeringsResult.error && !billsResult.error && !advancesResult.error) {
        setComparisonData({
          transactions: transactionsResult.data || [],
          offerings: offeringsResult.data || [],
          bills: billsResult.data || [],
          advances: advancesResult.data || [],
          funds: [] // Not needed for comparison
        })
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error)
    }
  }, [selectedChurch])

  // Apply filters to data
  const applyFilters = useCallback((data: ReportsData, filterConfig: FilterConfig): ReportsData => {
    let filteredTransactions = data.transactions
    let filteredOfferings = data.offerings
    let filteredBills = data.bills
    let filteredAdvances = data.advances
    let filteredFunds = data.funds

    // Transaction filters
    if (filterConfig.transactionFilters.types.length > 0) {
      filteredTransactions = filteredTransactions.filter(t =>
        filterConfig.transactionFilters.types.includes(t.type)
      )
    }
    if (filterConfig.transactionFilters.categories.length > 0) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.category && filterConfig.transactionFilters.categories.includes(t.category)
      )
    }
    if (filterConfig.transactionFilters.amountRange.min !== null) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.amount >= filterConfig.transactionFilters.amountRange.min!
      )
    }
    if (filterConfig.transactionFilters.amountRange.max !== null) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.amount <= filterConfig.transactionFilters.amountRange.max!
      )
    }

    // Offering filters
    if (filterConfig.offeringFilters.types.length > 0) {
      filteredOfferings = filteredOfferings.filter(o =>
        filterConfig.offeringFilters.types.includes(o.type)
      )
    }
    if (filterConfig.offeringFilters.amountRange.min !== null) {
      filteredOfferings = filteredOfferings.filter(o =>
        o.amount >= filterConfig.offeringFilters.amountRange.min!
      )
    }
    if (filterConfig.offeringFilters.amountRange.max !== null) {
      filteredOfferings = filteredOfferings.filter(o =>
        o.amount <= filterConfig.offeringFilters.amountRange.max!
      )
    }

    // Bill filters
    if (filterConfig.billFilters.statuses.length > 0) {
      filteredBills = filteredBills.filter(b =>
        filterConfig.billFilters.statuses.includes(b.status || 'pending')
      )
    }
    if (filterConfig.billFilters.overdue) {
      filteredBills = filteredBills.filter(b =>
        new Date(b.due_date) < new Date() && b.status !== 'paid'
      )
    }

    // Advance filters
    if (filterConfig.advanceFilters.statuses.length > 0) {
      filteredAdvances = filteredAdvances.filter(a =>
        filterConfig.advanceFilters.statuses.includes(a.status || 'outstanding')
      )
    }
    if (filterConfig.advanceFilters.overdue) {
      filteredAdvances = filteredAdvances.filter(a =>
        new Date(a.expected_return_date) < new Date() && a.status !== 'returned'
      )
    }

    // Fund filters
    if (filterConfig.fundFilters.fundIds.length > 0) {
      filteredFunds = filteredFunds.filter(f =>
        filterConfig.fundFilters.fundIds.includes(f.id)
      )
    }

    return {
      transactions: filteredTransactions,
      offerings: filteredOfferings,
      bills: filteredBills,
      advances: filteredAdvances,
      funds: filteredFunds
    }
  }, [])

  const handleFiltersChange = useCallback((newFilters: FilterConfig) => {
    setFilters(newFilters)

    // Refetch data if date range changed
    if (
      newFilters.dateRange.startDate !== filters.dateRange.startDate ||
      newFilters.dateRange.endDate !== filters.dateRange.endDate
    ) {
      fetchReportData({
        startDate: newFilters.dateRange.startDate,
        endDate: newFilters.dateRange.endDate
      })
      fetchComparisonData({
        startDate: newFilters.dateRange.startDate,
        endDate: newFilters.dateRange.endDate
      })
    }
  }, [filters, fetchReportData, fetchComparisonData])

  // Initial data fetch
  useEffect(() => {
    fetchReportData(filters.dateRange)
    fetchComparisonData(filters.dateRange)
  }, [fetchReportData, fetchComparisonData, filters.dateRange])

  const filteredData = applyFilters(reportData, filters)

  // Handle template application from settings
  const handleApplyTemplate = useCallback((template: any) => {
    setFilters(template.filters)
    // You might want to also set format preferences or other template settings
    toast.success(`Applied template: ${template.name}`)
  }, [])

  if (loading && reportData.transactions.length === 0) {
    return <FullScreenLoader message="Loading advanced reports..." />
  }

  if (!selectedChurch) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FileText className="h-16 w-16 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Church Selected</h3>
          <p className="text-gray-600">Please select a church to view reports</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-green-400/15 to-blue-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center animate-fade-in animate-slide-in-from-top-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-white" />
              Advanced Reports
            </h1>
            <p className="text-white/60">Comprehensive financial insights and analytics</p>
            {selectedChurch && (
              <Badge variant="secondary" className="mt-2">
                {selectedChurch.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ReportExporter data={filteredData} dateRange={filters.dateRange} />
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="animate-fade-in animate-slide-in-from-top-4" style={{ animationDelay: '100ms' }}>
          <AdvancedFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            funds={reportData.funds}
            availableCategories={availableCategories}
            availableVendors={availableVendors}
            availableRecipients={availableRecipients}
          />
        </div>

        {/* Main Content Tabs */}
        <div className="animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl border-white/20">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analysis
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <AdvancedDashboard
                data={filteredData}
                dateRange={filters.dateRange}
                filters={filters}
                comparisonData={comparisonData}
              />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card className="bg-white/10 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white/90">Transaction Details</CardTitle>
                  <CardDescription className="text-white/60">
                    Detailed view of all filtered transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-white/20">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20 bg-white/5">
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Type</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Category</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Description</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Amount</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-white/70">Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.transactions.slice(0, 50).map((transaction) => (
                            <tr key={transaction.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                              <td className="p-4 text-white/90">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant={transaction.type === 'income' ? 'success' : 'destructive'}
                                  className={`${
                                    transaction.type === 'income'
                                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                                  } backdrop-blur-sm`}
                                >
                                  {transaction.type}
                                </Badge>
                              </td>
                              <td className="p-4 text-white/90">{transaction.category || 'N/A'}</td>
                              <td className="p-4 text-white/90 max-w-xs truncate">
                                {transaction.description || 'No description'}
                              </td>
                              <td className="p-4 font-medium text-white/90">
                                ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-white/90">{transaction.payment_method || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredData.transactions.length === 0 && (
                      <div className="text-center py-8 text-white/60">
                        No transactions found matching the current filters.
                      </div>
                    )}
                    {filteredData.transactions.length > 50 && (
                      <div className="text-center py-4 text-white/60 border-t border-white/20">
                        Showing first 50 of {filteredData.transactions.length} transactions.
                        Use export to view all data.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="bg-white/10 backdrop-blur-xl border-white/20 rounded-lg p-6">
                <AdvancedAnalysis
                  data={filteredData}
                  dateRange={filters.dateRange}
                  filters={filters}
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="bg-white/10 backdrop-blur-xl border-white/20 rounded-lg p-6">
                <ReportSettings
                  currentFilters={filters}
                  onApplyTemplate={handleApplyTemplate}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}