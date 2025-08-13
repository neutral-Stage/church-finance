'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Banknote, Download, Save, RefreshCw, Calculator } from 'lucide-react'
import { FullScreenLoader } from '@/components/ui/loader'

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

// Animated Counter Component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const countRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const startValue = 0
    const endValue = value

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Ease-out cubic function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutCubic)

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, isVisible])

  return <div ref={countRef}>{formatCurrency(count)}</div>
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
    return <FullScreenLoader message="Loading cash breakdown data..." />
  }

  return (
    <div className="min-h-screen relative overflow-hidden ">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-indigo-400/25 to-purple-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in animate-slide-in-from-top-4 animate-duration-700">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              <Calculator className="h-10 w-10 text-white/80" />
              Cash Denomination Breakdown
            </h1>
            <p className="text-white/60 mt-2 text-lg">
              Track cash denominations across all fund categories
            </p>
          </div>
          <div className="flex gap-2">
            <GlassButton onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </GlassButton>
            <GlassButton onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </GlassButton>
            <Button onClick={saveData} disabled={saving} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 transition-all duration-300">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FUND_TYPES.map((fundType, index) => (
            <Card key={fundType} className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `${800 + index * 100}ms` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/70">{fundType}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white/90">
                  <AnimatedCounter value={calculateFundTotal(fundType)} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className={`bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl border-green-400/30 hover:from-green-500/25 hover:to-emerald-600/25 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `${800 + FUND_TYPES.length * 100}ms` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-200">Total Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-100">
                <AnimatedCounter value={calculateGrandTotal()} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Breakdown Tables */}
        <div className="space-y-6">
          {FUND_TYPES.map((fundType, index) => (
            <Card key={fundType} className={`bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `${1200 + index * 200}ms` }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white/90">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-white/70" />
                    {fundType}
                  </span>
                  <span className="text-lg font-semibold text-white/80">
                    Total: <AnimatedCounter value={calculateFundTotal(fundType)} duration={1500} />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/5">
                        <th className="text-left p-3 text-white/70 font-medium">Denomination</th>
                        <th className="text-left p-3 text-white/70 font-medium">Count</th>
                        <th className="text-right p-3 text-white/70 font-medium">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DENOMINATIONS.map(denomination => {
                        const count = fundData[fundType]?.[denomination] || 0
                        const total = denomination * count
                        return (
                          <tr key={denomination} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                            <td className="p-3 font-medium text-white/90">
                              ৳{denomination.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="0"
                                value={count}
                                onChange={(e) => updateCount(fundType, denomination, e.target.value)}
                                className="w-24 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/30 transition-all duration-200"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-white/90">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-white/30 font-bold bg-white/5">
                        <td className="p-3 text-white/90">Subtotal</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right text-white/90">
                          <AnimatedCounter value={calculateFundTotal(fundType)} duration={1500} />
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
        <Card className={`bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 backdrop-blur-xl border-green-400/30 hover:from-green-500/25 hover:via-emerald-500/25 hover:to-teal-500/25 transition-all duration-500 hover:scale-[1.02] animate-fade-in animate-slide-in-from-bottom-4 animate-duration-700`} style={{ animationDelay: `${1200 + FUND_TYPES.length * 200 + 200}ms` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-green-100 flex items-center gap-3">
                <Calculator className="h-7 w-7 text-green-200" />
                Grand Total
              </h3>
              <div className="text-4xl font-bold text-green-100">
                <AnimatedCounter value={calculateGrandTotal()} duration={2500} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}