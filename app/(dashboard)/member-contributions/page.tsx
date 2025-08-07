'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, DollarSign, TrendingUp, Download } from 'lucide-react'
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
          offering_members!inner(
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

      // Fetch funds for fund name lookup
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id, name')

      if (fundsError) throw fundsError

      const fundsMap = new Map(fundsData?.map(fund => [fund.id, fund.name]) || [])

      // Group contributions by member
      const memberMap = new Map<string, MemberContribution>()
      
      offeringsData?.forEach((offering) => {
        // Since we use inner join, each offering should have exactly one member
        const memberRecord = offering.offering_members?.[0]?.member
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
      
    } catch (error) {
      console.error('Error fetching member contributions:', error)
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading member contributions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member Contributions</h1>
          <p className="text-muted-foreground mt-2">
            Track individual member contribution history and generate reports
          </p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalContributions)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Member</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageContribution)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredContributions.filter(mc => {
                const lastContrib = new Date(mc.last_contribution_date)
                const threeMonthsAgo = new Date()
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                return lastContrib >= threeMonthsAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 3 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Members</label>
              <Input
                placeholder="Search by name or fellowship..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Fellowship</label>
              <Select value={selectedFellowship} onValueChange={setSelectedFellowship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fellowships</SelectItem>
                  {fellowships.map(fellowship => (
                    <SelectItem key={fellowship} value={fellowship}>
                      {fellowship}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_amount">Total Amount</SelectItem>
                  <SelectItem value="contribution_count">Number of Contributions</SelectItem>
                  <SelectItem value="last_contribution">Last Contribution</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Contributions List */}
      <div className="space-y-4">
        {filteredContributions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No member contributions found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredContributions.map((memberContrib) => (
            <Card key={memberContrib.member.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{memberContrib.member.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      {memberContrib.member.fellowship_name && (
                        <span>Fellowship: {memberContrib.member.fellowship_name}</span>
                      )}
                      {memberContrib.member.phone && (
                        <span>Phone: {memberContrib.member.phone}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(memberContrib.total_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {memberContrib.contribution_count} contribution{memberContrib.contribution_count !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last: {formatDate(memberContrib.last_contribution_date)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3">Recent Contributions:</h4>
                  {memberContrib.contributions.slice(0, 5).map((contrib) => (
                    <div key={contrib.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="font-medium">{formatDate(contrib.service_date)}</div>
                          <div className="text-muted-foreground text-xs">{contrib.fund_name}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {contrib.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(contrib.amount)}</div>
                        {contrib.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-32">
                            {contrib.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {memberContrib.contributions.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-muted-foreground">
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