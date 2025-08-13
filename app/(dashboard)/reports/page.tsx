'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getMonthStart, getMonthEnd } from '@/lib/utils'
import { Download, FileText, TrendingUp, TrendingDown, Banknote, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Offering = Database['public']['Tables']['offerings']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type Advance = Database['public']['Tables']['advances']['Row']
type Fund = Database['public']['Tables']['funds']['Row']

interface ReportData {
  transactions: Transaction[]
  offerings: Offering[]
  bills: Bill[]
  advances: Advance[]
  funds: Fund[]
}

interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netIncome: number
  totalOfferings: number
  totalBills: number
  totalAdvances: number
  fundBalances: { [key: string]: number }
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData>({
    transactions: [],
    offerings: [],
    bills: [],
    advances: [],
    funds: []
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: getMonthStart(new Date()),
    endDate: getMonthEnd(new Date())
  })
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly')
  const [exporting, setExporting] = useState(false)

  const updateDateRange = useCallback(() => {
    const now = new Date()
    let startDate: string
    let endDate: string

    switch (reportType) {
      case 'monthly':
        startDate = getMonthStart(now)
        endDate = getMonthEnd(now)
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
        const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0)
        startDate = quarterStart.toISOString().split('T')[0]
        endDate = quarterEnd.toISOString().split('T')[0]
        break
      case 'yearly':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        startDate = yearStart.toISOString().split('T')[0]
        endDate = yearEnd.toISOString().split('T')[0]
        break
      default:
        return // Keep current dates for custom
    }

    setDateRange({
      startDate,
      endDate
    })
  }, [reportType])

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', dateRange.startDate)
        .lte('transaction_date', dateRange.endDate)
        .order('transaction_date', { ascending: false })

      if (transactionsError) throw transactionsError

      // Fetch offerings
      const { data: offeringsData, error: offeringsError } = await supabase
        .from('offerings')
        .select('*')
        .gte('service_date', dateRange.startDate)
        .lte('service_date', dateRange.endDate)
        .order('service_date', { ascending: false })

      if (offeringsError) throw offeringsError

      // Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .gte('due_date', dateRange.startDate)
        .lte('due_date', dateRange.endDate)
        .order('due_date', { ascending: false })

      if (billsError) throw billsError

      // Fetch advances
      const { data: advancesData, error: advancesError } = await supabase
        .from('advances')
        .select('*')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)
        .order('created_at', { ascending: false })

      if (advancesError) throw advancesError

      // Fetch funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('*')
        .order('name')

      if (fundsError) throw fundsError

      setReportData({
        transactions: transactionsData || [],
        offerings: offeringsData || [],
        bills: billsData || [],
        advances: advancesData || [],
        funds: fundsData || []
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  useEffect(() => {
    updateDateRange()
  }, [updateDateRange])

  const calculateFinancialSummary = (): FinancialSummary => {
    const totalIncome = reportData.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = reportData.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalOfferings = reportData.offerings
      .reduce((sum, o) => sum + o.amount, 0)

    const totalBills = reportData.bills
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0)

    const totalAdvances = reportData.advances
      .reduce((sum, a) => sum + a.amount, 0)

    const fundBalances = reportData.funds.reduce((acc, fund) => {
      acc[fund.name] = fund.current_balance
      return acc
    }, {} as { [key: string]: number })

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      totalOfferings,
      totalBills,
      totalAdvances,
      fundBalances
    }
  }

  const exportToExcel = async () => {
    try {
      setExporting(true)
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new()
      
      // Financial Summary Sheet
      const summary = calculateFinancialSummary()
      const summaryData = [
        ['Church Finance Report'],
        [`Period: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`],
        ['Generated:', formatDate(new Date().toISOString().split('T')[0])],
        [''],
        ['FINANCIAL SUMMARY'],
        ['Total Income', summary.totalIncome],
        ['Total Expenses', summary.totalExpenses],
        ['Net Income', summary.netIncome],
        ['Total Offerings', summary.totalOfferings],
        ['Total Bills Paid', summary.totalBills],
        ['Total Advances', summary.totalAdvances],
        [''],
        ['FUND BALANCES'],
        ...Object.entries(summary.fundBalances).map(([name, balance]) => [name, balance])
      ]
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
      
      // Transactions Sheet
      const transactionsData = [
        ['Date', 'Type', 'Category', 'Description', 'Amount', 'Fund']
      ]
      
      reportData.transactions.forEach(transaction => {
        const fund = reportData.funds.find(f => f.id === transaction.fund_id)
        transactionsData.push([
          formatDate(transaction.transaction_date),
          transaction.type,
          transaction.category,
          transaction.description,
          transaction.amount.toString(),
          fund?.name || 'Unknown'
        ])
      })
      
      const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData)
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')
      
      // Offerings Sheet
      const offeringsData = [
        ['Date', 'Type', 'Amount', 'Fund', 'Contributors', 'Notes']
      ]
      
      reportData.offerings.forEach(offering => {
        // Parse fund allocations to get the primary fund
        const fundAllocations = typeof offering.fund_allocations === 'string' 
          ? JSON.parse(offering.fund_allocations) 
          : offering.fund_allocations
        const primaryFundId = Array.isArray(fundAllocations) && fundAllocations.length > 0 
          ? fundAllocations[0].fund_id 
          : null
        const fund = reportData.funds.find(f => f.id === primaryFundId)
        offeringsData.push([
          formatDate(offering.service_date),
          offering.type,
          offering.amount.toString(),
          fund?.name || 'Multiple Funds',
          (offering.contributors_count || 0).toString(),
          offering.notes || ''
        ])
      })
      
      const offeringsSheet = XLSX.utils.aoa_to_sheet(offeringsData)
      XLSX.utils.book_append_sheet(workbook, offeringsSheet, 'Offerings')
      
      // Bills Sheet
      const billsData = [
        ['Vendor', 'Description', 'Amount', 'Due Date', 'Status', 'Recurring', 'Fund']
      ]
      
      reportData.bills.forEach(bill => {
        const fund = reportData.funds.find(f => f.id === bill.fund_id)
        billsData.push([
          bill.vendor_name,
          bill.category,
          bill.amount.toString(),
          formatDate(bill.due_date),
          bill.status,
          bill.frequency || 'No',
          fund?.name || 'Unknown'
        ])
      })
      
      const billsSheet = XLSX.utils.aoa_to_sheet(billsData)
      XLSX.utils.book_append_sheet(workbook, billsSheet, 'Bills')
      
      // Advances Sheet
      const advancesData = [
        ['Date', 'Recipient', 'Purpose', 'Amount', 'Repaid', 'Balance', 'Status', 'Return Date', 'Fund']
      ]
      
      reportData.advances.forEach(advance => {
        const fund = reportData.funds.find(f => f.id === advance.fund_id)
        advancesData.push([
          formatDate(advance.created_at),
          advance.recipient_name,
          advance.purpose,
          advance.amount.toString(),
          advance.amount_returned.toString(),
          (advance.amount - advance.amount_returned).toString(),
          advance.status,
          formatDate(advance.expected_return_date),
          fund?.name || 'Unknown'
        ])
      })
      
      const advancesSheet = XLSX.utils.aoa_to_sheet(advancesData)
      XLSX.utils.book_append_sheet(workbook, advancesSheet, 'Advances')
      
      // Generate filename
      const filename = `Church_Finance_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`
      
      // Write and download the file
      XLSX.writeFile(workbook, filename)
      
      toast.success('Report exported successfully')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  const summary = calculateFinancialSummary()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80"></div>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/40 border-t-white/60 absolute top-2 left-2" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      
      <div className="container mx-auto p-6 space-y-6 relative z-10 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-in-from-bottom-4" style={{animationDelay: '100ms'}}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Reports &amp; Export
          </h1>
          <p className="text-white/60 mt-2">
            Generate financial reports and export data
          </p>
        </div>
        <Button onClick={exportToExcel} disabled={exporting} className="glass-button-outline hover:scale-105 transition-all duration-300">
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      {/* Report Controls */}
      <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-slide-in-from-bottom-4" style={{animationDelay: '200ms'}}>
        <CardHeader>
          <CardTitle className="text-white/90">Report Settings</CardTitle>
          <CardDescription className="text-white/60">Configure the date range and type for your financial report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-white/90">Report Type</Label>
              <Select value={reportType} onValueChange={(value: typeof reportType) => setReportType(value)}>
                <SelectTrigger className="glass-dropdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-dropdown">
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-white/90">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                disabled={reportType !== 'custom'}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-white/90">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                disabled={reportType !== 'custom'}
                className="glass-input"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReportData} className="w-full glass-button hover:scale-105 transition-all duration-300">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-slide-in-from-bottom-4" style={{animationDelay: '300ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Income</CardTitle>
            <div className="p-2 bg-green-500/20 backdrop-blur-sm rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              <AnimatedCounter value={summary.totalIncome} prefix="৳" />
            </div>
            <p className="text-xs text-white/60">
              Including <AnimatedCounter value={summary.totalOfferings} prefix="৳" className="text-white/80" /> in offerings
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-slide-in-from-bottom-4" style={{animationDelay: '350ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Expenses</CardTitle>
            <div className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              <AnimatedCounter value={summary.totalExpenses} prefix="৳" />
            </div>
            <p className="text-xs text-white/60">
              Including <AnimatedCounter value={summary.totalBills} prefix="৳" className="text-white/80" /> in bills
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-slide-in-from-bottom-4" style={{animationDelay: '400ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Net Income</CardTitle>
            <div className={`p-2 ${summary.netIncome >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} backdrop-blur-sm rounded-lg`}>
              <Banknote className={`h-4 w-4 ${summary.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <AnimatedCounter value={summary.netIncome} prefix="৳" />
            </div>
            <p className="text-xs text-white/60">
              {summary.netIncome >= 0 ? 'Surplus' : 'Deficit'} for period
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-slide-in-from-bottom-4" style={{animationDelay: '450ms'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Advances</CardTitle>
            <div className="p-2 bg-blue-500/20 backdrop-blur-sm rounded-lg">
              <Calendar className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              <AnimatedCounter value={summary.totalAdvances} prefix="৳" />
            </div>
            <p className="text-xs text-white/60">
              <AnimatedCounter value={reportData.advances.length} className="text-white/80" /> advance{reportData.advances.length !== 1 ? 's' : ''} issued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fund Balances */}
      <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-slide-in-from-bottom-4" style={{animationDelay: '500ms'}}>
        <CardHeader>
          <CardTitle className="text-white/90">Current Fund Balances</CardTitle>
          <CardDescription className="text-white/60">Real-time balances across all church funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {reportData.funds.map((fund, index) => (
              <div key={fund.id} className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 animate-slide-in-from-bottom-4" style={{animationDelay: `${550 + index * 50}ms`}}>
                <div>
                  <h3 className="font-medium text-white/90">{fund.name}</h3>
                  <p className="text-sm text-white/60">{fund.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white/90">
                    <AnimatedCounter value={fund.current_balance} prefix="৳" />
                  </div>
                  <Badge variant={fund.current_balance >= 0 ? 'success' : 'destructive'} className="bg-white/10 backdrop-blur-sm border-white/20">
                    {fund.current_balance >= 0 ? 'Positive' : 'Negative'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-slide-in-from-bottom-4" style={{animationDelay: '600ms'}}>
          <CardHeader>
            <CardTitle className="text-white/90">Recent Transactions</CardTitle>
            <CardDescription className="text-white/60">
              <AnimatedCounter value={reportData.transactions.length} className="text-white/80" /> transaction{reportData.transactions.length !== 1 ? 's' : ''} in selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reportData.transactions.slice(0, 10).map((transaction, index) => {
                const fund = reportData.funds.find(f => f.id === transaction.fund_id)
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 animate-slide-in-from-bottom-4" style={{animationDelay: `${650 + index * 30}ms`}}>
                    <div>
                      <div className="font-medium text-white/90">{transaction.description}</div>
                      <div className="text-sm text-white/60">
                        {transaction.category} • {fund?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}<AnimatedCounter value={transaction.amount} prefix="৳" />
                      </div>
                      <div className="text-sm text-white/60">
                        {formatDate(transaction.transaction_date)}
                      </div>
                    </div>
                  </div>
                )
              })}
              {reportData.transactions.length === 0 && (
                <div className="text-center py-4 text-white/60">
                  No transactions in selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Offerings */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-slide-in-from-bottom-4" style={{animationDelay: '650ms'}}>
          <CardHeader>
            <CardTitle className="text-white/90">Recent Offerings</CardTitle>
            <CardDescription className="text-white/60">
              <AnimatedCounter value={reportData.offerings.length} className="text-white/80" /> offering{reportData.offerings.length !== 1 ? 's' : ''} in selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reportData.offerings.slice(0, 10).map((offering, index) => {
                // Parse fund allocations to get the primary fund
                const fundAllocations = typeof offering.fund_allocations === 'string' 
                  ? JSON.parse(offering.fund_allocations) 
                  : offering.fund_allocations
                const primaryFundId = Array.isArray(fundAllocations) && fundAllocations.length > 0 
                  ? fundAllocations[0].fund_id 
                  : null
                const fund = reportData.funds.find(f => f.id === primaryFundId)
                return (
                  <div key={offering.id} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 animate-slide-in-from-bottom-4" style={{animationDelay: `${700 + index * 30}ms`}}>
                    <div>
                      <div className="font-medium text-white/90">{offering.type}</div>
                      <div className="text-sm text-white/60">
                        {fund?.name || 'Multiple Funds'} • <AnimatedCounter value={offering.contributors_count || 0} className="text-white/80" /> contributors
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-400">
                        <AnimatedCounter value={offering.amount} prefix="৳" />
                      </div>
                      <div className="text-sm text-white/60">
                        {formatDate(offering.service_date)}
                      </div>
                    </div>
                  </div>
                )
              })}
              {reportData.offerings.length === 0 && (
                <div className="text-center py-4 text-white/60">
                  No offerings in selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Period Info */}
      <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-slide-in-from-bottom-4" style={{animationDelay: '700ms'}}>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-white/60">
            Report generated for period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            <br />
            Generated on: {formatDate(new Date().toISOString().split('T')[0])} by {user?.email}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}