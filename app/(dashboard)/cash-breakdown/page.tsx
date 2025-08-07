'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Banknote, Download, Save, RefreshCw } from 'lucide-react'

interface CashBreakdownData {
  id: string
  fund_type: string
  denomination: number
  count: number
  total_amount: number
}

interface FundData {
  [key: string]: {
    [denomination: number]: number
  }
}

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]
const FUND_TYPES = ['Mission Fund', 'Management Fund', 'Building Fund']

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString()}`
}

export default function CashBreakdownPage() {
  const [fundData, setFundData] = useState<FundData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Initialize fund data structure
  useEffect(() => {
    const initialData: FundData = {}
    FUND_TYPES.forEach(fund => {
      initialData[fund] = {}
      DENOMINATIONS.forEach(denom => {
        initialData[fund][denom] = 0
      })
    })
    setFundData(initialData)
  }, [])

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cash_breakdown')
        .select('*')
        .order('fund_type')
        .order('denomination', { ascending: false })

      if (error) throw error

      if (data) {
        const newFundData: FundData = {}
        FUND_TYPES.forEach(fund => {
          newFundData[fund] = {}
          DENOMINATIONS.forEach(denom => {
            newFundData[fund][denom] = 0
          })
        })

        data.forEach((item: CashBreakdownData) => {
          if (newFundData[item.fund_type]) {
            newFundData[item.fund_type][item.denomination] = item.count
          }
        })

        setFundData(newFundData)
      }
    } catch (error) {
      console.error('Error fetching cash breakdown data:', error)
      toast.error('Failed to load cash breakdown data')
    } finally {
      setLoading(false)
    }
  }

  // Save data to Supabase
  const saveData = async () => {
    try {
      setSaving(true)
      const updates: Array<{
        fund_type: string
        denomination: number
        count: number
      }> = []

      Object.entries(fundData).forEach(([fundType, denominations]) => {
        Object.entries(denominations).forEach(([denomination, count]) => {
          updates.push({
            fund_type: fundType,
            denomination: parseInt(denomination),
            count: count
          })
        })
      })

      const { error } = await supabase
        .from('cash_breakdown')
        .upsert(updates, {
          onConflict: 'fund_type,denomination'
        })

      if (error) throw error

      toast.success('Cash breakdown data saved successfully!')
    } catch (error) {
      console.error('Error saving cash breakdown data:', error)
      toast.error('Failed to save cash breakdown data')
    } finally {
      setSaving(false)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const csvData = []
    csvData.push(['Fund Type', 'Denomination', 'Count', 'Total Amount'])

    Object.entries(fundData).forEach(([fundType, denominations]) => {
      Object.entries(denominations).forEach(([denomination, count]) => {
        const totalAmount = parseInt(denomination) * count
        csvData.push([fundType, `৳${denomination}`, count.toString(), formatCurrency(totalAmount)])
      })
    })

    // Add fund totals
    csvData.push(['', '', '', ''])
    csvData.push(['Fund Totals:', '', '', ''])
    Object.entries(fundData).forEach(([fundType]) => {
      const total = calculateFundTotal(fundType)
      csvData.push([fundType, '', '', formatCurrency(total)])
    })

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cash-breakdown-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('CSV exported successfully!')
  }

  // Calculate total for a specific fund
  const calculateFundTotal = (fundType: string): number => {
    if (!fundData[fundType]) return 0
    return Object.entries(fundData[fundType]).reduce((total, [denomination, count]) => {
      return total + (parseInt(denomination) * count)
    }, 0)
  }

  // Calculate grand total
  const calculateGrandTotal = (): number => {
    return FUND_TYPES.reduce((total, fundType) => {
      return total + calculateFundTotal(fundType)
    }, 0)
  }

  // Update count for specific fund and denomination
  const updateCount = (fundType: string, denomination: number, value: string) => {
    const count = parseInt(value) || 0
    if (count < 0) return

    setFundData(prev => ({
      ...prev,
      [fundType]: {
        ...prev[fundType],
        [denomination]: count
      }
    }))
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading cash breakdown data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Banknote className="h-8 w-8" />
            Cash Denomination Breakdown
          </h1>
          <p className="text-muted-foreground mt-2">
            Track cash denominations across all fund categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={saveData} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {FUND_TYPES.map(fundType => (
          <Card key={fundType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{fundType}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(calculateFundTotal(fundType))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculateGrandTotal())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Breakdown Tables */}
      <div className="space-y-6">
        {FUND_TYPES.map(fundType => (
          <Card key={fundType}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {fundType}
                <span className="text-lg font-semibold">
                  Total: {formatCurrency(calculateFundTotal(fundType))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Denomination</th>
                      <th className="text-left p-2">Count</th>
                      <th className="text-right p-2">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DENOMINATIONS.map(denomination => {
                      const count = fundData[fundType]?.[denomination] || 0
                      const total = denomination * count
                      return (
                        <tr key={denomination} className="border-b">
                          <td className="p-2 font-medium">
                            ৳{denomination.toLocaleString()}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) => updateCount(fundType, denomination, e.target.value)}
                              className="w-24"
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Subtotal</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right">
                        {formatCurrency(calculateFundTotal(fundType))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grand Total */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Grand Total</h3>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(calculateGrandTotal())}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}