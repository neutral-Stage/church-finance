'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, DollarSign, TrendingUp, Download, Users, Gift } from 'lucide-react'
import { toast } from 'sonner'

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
  const [fellowships, setFellowships] = useState<string[]>([])

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

      // Process offerings data to convert offering_member array to single object
      const processedOfferings = offeringsData?.map(offering => ({
        ...offering,
        offering_member: offering.offering_member && offering.offering_member.length > 0
          ? offering.offering_member[0]
          : null
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
        // Since we use inner join, each offering should have exactly one member
        const memberRecord = offering.offering_member?.member
        if (!memberRecord) return

        const member = Array.isArray(memberRecord) ? memberRecord[0] : memberRecord
        if (!member) return

        if (!memberMap.has(member.id)) {
          memberMap.set(member.id, {
            member,
            contributions: [],
            total_amount: 0,
            contribution_count: 0,
            last_contribution_date: ''
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

      // Sort contributions within each member by date (newest first)
      memberMap.forEach((memberContrib) => {
        memberContrib.contributions.sort((a, b) =>
          new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        )
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
      switch (sortBy) {
        case 'total_amount':
          return b.total_amount - a.total_amount
        case 'contribution_count':
          return b.contribution_count - a.contribution_count
        case 'last_contribution':
          return new Date(b.last_contribution_date).getTime() - new Date(a.last_contribution_date).getTime()
        case 'name':
          return a.member.name.localeCompare(b.member.name)
        default:
          return 0
      }
    })

    setFilteredContributions(filtered)
  }, [memberContributions, searchTerm, selectedFellowship, sortBy])

  useEffect(() => {
    fetchMemberContributions()
  }, [fetchMemberContributions])

  useEffect(() => {
    filterAndSortContributions()
  }, [filterAndSortContributions])

  const exportToCSV = () => {
    const csvData = filteredContributions.flatMap(mc =>
      mc.contributions.map(contrib => ({
        'Member Name': mc.member.name,
        'Fellowship': mc.member.fellowship_name || '',
        'Phone': mc.member.phone || '',
        'Service Date': formatDate(contrib.service_date),
        'Type': contrib.type,
        'Amount': contrib.amount,
        'Fund': contrib.fund_name,
        'Notes': contrib.notes || ''
      }))
    )

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-contributions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Contributions exported successfully')
  }

  const totalContributions = filteredContributions.reduce((sum, mc) => sum + mc.total_amount, 0)
  const totalMembers = filteredContributions.length
  const averageContribution = totalMembers > 0 ? totalContributions / totalMembers : 0

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mx-auto mb-4"></div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/10 border-t-white/60 mx-auto absolute top-2 left-1/2 transform -translate-x-1/2" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-white/80 font-medium">Loading member contributions...</p>
          </div>
        </div>
      </div>
    )
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
                  <SelectItem value="name" className="text-white hover:bg-white/10">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Contributions List */}
      <div className="space-y-4">
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
              style={{ animationDelay: `${600 + (index * 50)}ms` }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{memberContrib.member.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1 text-white/60">
                      {memberContrib.member.fellowship_name && (
                        <span>Fellowship: {memberContrib.member.fellowship_name}</span>
                      )}
                      {memberContrib.member.phone && (
                        <span>Phone: {memberContrib.member.phone}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-300">
                      {formatCurrency(memberContrib.total_amount)}
                    </div>
                    <div className="text-sm text-white/70">
                      {memberContrib.contribution_count} contribution{memberContrib.contribution_count !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-white/50">
                      Last: {formatDate(memberContrib.last_contribution_date)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3 text-white/90">Recent Contributions:</h4>
                  {memberContrib.contributions.slice(0, 5).map((contrib) => (
                    <div key={contrib.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="font-medium text-white/90">{formatDate(contrib.service_date)}</div>
                          <div className="text-white/60 text-xs">{contrib.fund_name}</div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-white/80">
                          {contrib.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">{formatCurrency(contrib.amount)}</div>
                        {contrib.notes && (
                          <div className="text-xs text-white/50 truncate max-w-32">
                            {contrib.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {memberContrib.contributions.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-white/60">
                        +{memberContrib.contributions.length - 5} more contributions
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}