'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Calendar, User, DollarSign, TrendingUp, Download, Users, Gift, ChevronUp, ChevronDown, Info } from 'lucide-react'
import { toast } from 'sonner'
import { FullScreenLoader } from '@/components/ui/loader'

interface Member {
  id: string
  name: string
  phone?: string
  fellowship_name?: string
  job?: string
  location?: string
}

interface ContributionRecord {
  id: string
  service_date: string
  type: string
  amount: number
  fund_name: string
  notes?: string
}

interface MemberContribution {
  member: Member
  contributions: ContributionRecord[]
  total_amount: number
  contribution_count: number
  last_contribution_date: string
  missing_months: number
  missing_months_list: string[]
  average_monthly_amount: number
  average_annual_amount: number
  months_with_contributions: number
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString()}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Tooltip Component
interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

function Tooltip({ children, content, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 border border-gray-700">
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          {content}
        </div>
      )}
    </div>
  )
}

// Animated Counter Component
interface AnimatedCounterProps {
  value: number
  duration?: number
  formatter?: (value: number) => string
}

function AnimatedCounter({ value, duration = 2000, formatter = (v) => v.toString() }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const startValue = count
    const endValue = value

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutCubic)

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, value, duration, count])

  return <span ref={ref}>{formatter(count)}</span>
}

export default function MemberContributionsPage() {
  const [memberContributions, setMemberContributions] = useState<MemberContribution[]>([])
  const [filteredContributions, setFilteredContributions] = useState<MemberContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFellowship, setSelectedFellowship] = useState('all')
  const [sortBy, setSortBy] = useState('total_amount')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [fellowships, setFellowships] = useState<string[]>([])

  // Helper function to calculate missing months and averages
  const calculateMemberAnalytics = (contributions: ContributionRecord[]) => {
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    
    // Get all months in the past 12 months
    const allMonths: string[] = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      allMonths.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }
    
    // Get months with contributions
    const contributionMonths = new Set(
      contributions
        .filter(c => new Date(c.service_date) >= twelveMonthsAgo)
        .map(c => {
          const date = new Date(c.service_date)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        })
    )
    
    const missingMonths = allMonths.filter(month => !contributionMonths.has(month))
    const monthsWithContributions = contributionMonths.size
    
    // Calculate total amount in the past 12 months
    const recentContributions = contributions.filter(c => new Date(c.service_date) >= twelveMonthsAgo)
    const totalRecentAmount = recentContributions.reduce((sum, c) => sum + c.amount, 0)
    
    // Calculate averages
    const averageMonthly = monthsWithContributions > 0 ? totalRecentAmount / monthsWithContributions : 0
    const averageAnnual = totalRecentAmount // This is already the annual amount for the past 12 months
    
    return {
      missing_months: missingMonths.length,
      missing_months_list: missingMonths.sort().reverse(), // Most recent missing months first
      average_monthly_amount: averageMonthly,
      average_annual_amount: averageAnnual,
      months_with_contributions: monthsWithContributions
    }
  }

  const fetchMemberContributions = useCallback(async () => {
    try {
      setLoading(true)


      // Fetch all offerings with their member and fund information
      const { data: offeringsData, error: offeringsError } = await supabase
        .from('offerings')
        .select(`
          id,
          service_date,
          type,
          amount,
          notes,
          fund_allocations,
          offering_member!inner(
            id,
            member_id,
            member:members(
              id,
              name,
              phone,
              fellowship_name,
              job,
              location
            )
          )
        `)
        .order('service_date', { ascending: false })



      if (offeringsError) throw offeringsError

      // Since offering_member is a single object (not array) due to unique constraint
      const processedOfferings = offeringsData?.map(offering => ({
        ...offering,
        offering_member: offering.offering_member || null
      })) || []

      // Fetch funds for fund name lookup
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id, name')

      if (fundsError) throw fundsError

      const fundsMap = new Map(fundsData?.map(fund => [fund.id, fund.name]) || [])

      // Group contributions by member
      const memberMap = new Map<string, MemberContribution>()


      processedOfferings.forEach((offering) => {
        // Since offering_member is now a single object (not array)
        const offeringMember = offering.offering_member
        if (!offeringMember) {
          return
        }

        const member = (offeringMember as unknown as { member: Member }).member
        if (!member) {
          return
        }



        if (!memberMap.has(member.id)) {
          memberMap.set(member.id, {
            member,
            contributions: [],
            total_amount: 0,
            contribution_count: 0,
            last_contribution_date: '',
            missing_months: 0,
            missing_months_list: [],
            average_monthly_amount: 0,
            average_annual_amount: 0,
            months_with_contributions: 0
          })
        }

        const memberContrib = memberMap.get(member.id)!

        // Determine fund name from fund_allocations
        let fundName = 'Unknown'
        if (offering.fund_allocations && typeof offering.fund_allocations === 'object') {
          const fundAllocations = offering.fund_allocations as Record<string, number>
          const fundIds = Object.keys(fundAllocations)
          if (fundIds.length > 0) {
            fundName = fundsMap.get(fundIds[0]) || 'Unknown'
          }
        }

        memberContrib.contributions.push({
          id: offering.id,
          service_date: offering.service_date,
          type: offering.type,
          amount: offering.amount,
          fund_name: fundName,
          notes: offering.notes
        })

        memberContrib.total_amount += offering.amount
        memberContrib.contribution_count += 1

        if (!memberContrib.last_contribution_date ||
          offering.service_date > memberContrib.last_contribution_date) {
          memberContrib.last_contribution_date = offering.service_date
        }
      })

      // Sort contributions within each member by date (newest first) and calculate analytics
      memberMap.forEach((memberContrib) => {
        memberContrib.contributions.sort((a, b) =>
          new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        )
        
        // Calculate missing months and averages
        const analytics = calculateMemberAnalytics(memberContrib.contributions)
        memberContrib.missing_months = analytics.missing_months
        memberContrib.missing_months_list = analytics.missing_months_list
        memberContrib.average_monthly_amount = analytics.average_monthly_amount
        memberContrib.average_annual_amount = analytics.average_annual_amount
        memberContrib.months_with_contributions = analytics.months_with_contributions
      })

      const contributions = Array.from(memberMap.values())

      setMemberContributions(contributions)

      // Extract unique fellowships for filtering
      const uniqueFellowships = [...new Set(
        contributions
          .map(mc => mc.member.fellowship_name)
          .filter(Boolean)
      )] as string[]

      setFellowships(uniqueFellowships.sort())

    } catch {
      toast.error('Failed to load member contributions')
    } finally {
      setLoading(false)
    }
  }, [])

  const filterAndSortContributions = useCallback(() => {
    const filtered = memberContributions.filter(mc => {
      const matchesSearch = mc.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mc.member.fellowship_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

      const matchesFellowship = selectedFellowship === 'all' ||
        mc.member.fellowship_name === selectedFellowship

      return matchesSearch && matchesFellowship
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let result = 0
      switch (sortBy) {
        case 'total_amount':
          result = b.total_amount - a.total_amount
          break
        case 'contribution_count':
          result = b.contribution_count - a.contribution_count
          break
        case 'last_contribution':
          result = new Date(b.last_contribution_date).getTime() - new Date(a.last_contribution_date).getTime()
          break
        case 'missing_months':
          result = b.missing_months - a.missing_months
          break
        case 'average_monthly_amount':
          result = b.average_monthly_amount - a.average_monthly_amount
          break
        case 'average_annual_amount':
          result = b.average_annual_amount - a.average_annual_amount
          break
        case 'name':
          result = a.member.name.localeCompare(b.member.name)
          break
        case 'fellowship':
          result = (a.member.fellowship_name || '').localeCompare(b.member.fellowship_name || '')
          break
        default:
          return 0
      }
      return sortDirection === 'desc' ? result : -result
    })

    setFilteredContributions(filtered)
  }, [memberContributions, searchTerm, selectedFellowship, sortBy, sortDirection])

  useEffect(() => {
    fetchMemberContributions()
  }, [fetchMemberContributions])

  useEffect(() => {
    filterAndSortContributions()
  }, [filterAndSortContributions])

  const handleColumnSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ChevronUp className="h-4 w-4 text-white/30" />
    }
    return sortDirection === 'desc' ? 
      <ChevronDown className="h-4 w-4 text-white/80" /> : 
      <ChevronUp className="h-4 w-4 text-white/80" />
  }

  const exportToCSV = () => {
    const csvData = filteredContributions.map(mc => ({
      'Member Name': mc.member.name,
      'Fellowship': mc.member.fellowship_name || '',
      'Total Amount': formatCurrency(mc.total_amount),
      'Contributions Count': mc.contribution_count,
      'Missing Months': mc.missing_months,
      'Average Monthly': formatCurrency(mc.average_monthly_amount),
      'Average Annual': formatCurrency(mc.average_annual_amount),
      'Last Contribution Date': formatDate(mc.last_contribution_date)
    }))

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-contributions-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Member contributions summary exported successfully')
  }

  const totalContributions = filteredContributions.reduce((sum, mc) => sum + mc.total_amount, 0)
  const totalMembers = filteredContributions.length
  const averageContribution = totalMembers > 0 ? totalContributions / totalMembers : 0

  if (loading) {
    return <FullScreenLoader message="Loading member contributions..." />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between animate-fade-in animate-slide-in-from-top-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            <Users className="inline-block w-8 h-8 mr-3 text-white/90" />
            Member Contributions
          </h1>
          <p className="text-white/60 mt-2">
            Track individual member contribution history and generate reports
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl transition-all duration-300 hover:scale-105"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Members</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
              <User className="h-4 w-4 text-blue-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={totalMembers} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Contributions</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm">
              <DollarSign className="h-4 w-4 text-green-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={totalContributions} formatter={formatCurrency} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Average per Member</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-purple-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={averageContribution} formatter={formatCurrency} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Active Contributors</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-orange-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={filteredContributions.filter(mc => {
                const lastContrib = new Date(mc.last_contribution_date)
                const threeMonthsAgo = new Date()
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                return lastContrib >= threeMonthsAgo
              }).length} />
            </div>
            <p className="text-xs text-white/60">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="text-white/90 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-white/80">Search Members</label>
              <Input
                placeholder="Search by name or fellowship..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-white/80">Fellowship</label>
              <Select value={selectedFellowship} onValueChange={setSelectedFellowship}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-xl border-white/20">
                  <SelectItem value="all" className="text-white hover:bg-white/10">All Fellowships</SelectItem>
                  {fellowships.map(fellowship => (
                    <SelectItem key={fellowship} value={fellowship} className="text-white hover:bg-white/10">
                      {fellowship}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-white/80">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 backdrop-blur-xl border-white/20">
                  <SelectItem value="total_amount" className="text-white hover:bg-white/10">Total Amount</SelectItem>
                  <SelectItem value="contribution_count" className="text-white hover:bg-white/10">Number of Contributions</SelectItem>
                  <SelectItem value="last_contribution" className="text-white hover:bg-white/10">Last Contribution</SelectItem>
                  <SelectItem value="missing_months" className="text-white hover:bg-white/10">Missing Months</SelectItem>
                  <SelectItem value="average_monthly_amount" className="text-white hover:bg-white/10">Avg Monthly Amount</SelectItem>
                  <SelectItem value="average_annual_amount" className="text-white hover:bg-white/10">Avg Annual Amount</SelectItem>
                  <SelectItem value="name" className="text-white hover:bg-white/10">Name (A-Z)</SelectItem>
                  <SelectItem value="fellowship" className="text-white hover:bg-white/10">Fellowship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Member List Table Headers */}
      {filteredContributions.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '550ms' }}>
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-3 items-center text-sm font-medium">
              <div className="col-span-2">
                <button
                  onClick={() => handleColumnSort('name')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'name' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Member Name
                  {getSortIcon('name')}
                </button>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => handleColumnSort('fellowship')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'fellowship' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Fellowship
                  {getSortIcon('fellowship')}
                </button>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => handleColumnSort('total_amount')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'total_amount' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Total Amount
                  {getSortIcon('total_amount')}
                </button>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => handleColumnSort('contribution_count')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'contribution_count' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Count
                  {getSortIcon('contribution_count')}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleColumnSort('missing_months')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'missing_months' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Missing Months
                  {getSortIcon('missing_months')}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleColumnSort('average_monthly_amount')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'average_monthly_amount' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Avg Monthly
                  {getSortIcon('average_monthly_amount')}
                </button>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => handleColumnSort('average_annual_amount')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'average_annual_amount' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Avg Annual
                  {getSortIcon('average_annual_amount')}
                </button>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => handleColumnSort('last_contribution')}
                  className={`flex items-center gap-1 transition-colors hover:text-white ${
                    sortBy === 'last_contribution' ? 'text-white' : 'text-white/70'
                  }`}
                >
                  Last Date
                  {getSortIcon('last_contribution')}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Comprehensive Member List Table */}
      <div className="space-y-2">
        {filteredContributions.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '600ms' }}>
            <CardContent className="text-center py-8">
              <p className="text-white/60">No member contributions found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredContributions.map((memberContrib, index) => (
            <Card
              key={memberContrib.member.id}
              className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4"
              style={{ animationDelay: `${600 + (index * 30)}ms` }}
            >
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-center text-sm">
                  {/* Member Name */}
                  <div className="col-span-2">
                    <div className="font-medium text-white">{memberContrib.member.name}</div>
                    {memberContrib.member.phone && (
                      <div className="text-white/50 text-xs mt-1">
                        {memberContrib.member.phone}
                      </div>
                    )}
                  </div>
                  
                  {/* Fellowship */}
                  <div className="col-span-1">
                    <div className="text-white/80 text-xs">
                      {memberContrib.member.fellowship_name || 'N/A'}
                    </div>
                  </div>
                  
                  {/* Total Amount */}
                  <div className="col-span-1">
                    <div className="font-semibold text-green-300">
                      {formatCurrency(memberContrib.total_amount)}
                    </div>
                  </div>
                  
                  {/* Contribution Count */}
                  <div className="col-span-1">
                    <div className="text-white/80 text-center">
                      {memberContrib.contribution_count}
                    </div>
                  </div>
                  
                  {/* Missing Months */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        memberContrib.missing_months === 0 
                          ? 'text-green-400' 
                          : memberContrib.missing_months <= 2 
                          ? 'text-yellow-400' 
                          : 'text-red-400'
                      }`}>
                        {memberContrib.missing_months}
                      </span>
                      {memberContrib.missing_months > 0 && (
                        <Tooltip 
                          content={`Missing months: ${memberContrib.missing_months_list.join(', ')}`}
                          className="cursor-help"
                        >
                          <Info className="w-4 h-4 text-white/50 hover:text-white/80 transition-colors" />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  
                  {/* Average Monthly Amount */}
                  <div className="col-span-2">
                    <div className="text-white/80">
                      {formatCurrency(memberContrib.average_monthly_amount)}
                    </div>
                    <div className="text-xs text-white/50">
                      ({memberContrib.months_with_contributions}/12 months)
                    </div>
                  </div>
                  
                  {/* Average Annual Amount */}
                  <div className="col-span-2">
                    <div className="text-white/80 font-medium">
                      {formatCurrency(memberContrib.average_annual_amount)}
                    </div>
                  </div>
                  
                  {/* Last Contribution Date */}
                  <div className="col-span-1">
                    <div className="text-white/70 text-xs">
                      {formatDate(memberContrib.last_contribution_date)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}