'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Progress } from '@/components/ui/progress'

import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Search,
  Filter,
  UserCheck,
  AlertTriangle,
  Phone,
  MapPin,
  Briefcase,
  Eye
} from 'lucide-react'
import type { MemberContribution } from '@/lib/server-data'

interface MemberContributionsClientProps {
  initialData: MemberContribution[]
}

export default function MemberContributionsClient({ initialData }: MemberContributionsClientProps) {
  const [memberContributions] = useState<MemberContribution[]>(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'recent' | 'frequency'>('total')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing'>('all')
  const [selectedMember, setSelectedMember] = useState<MemberContribution | null>(null)

  // Memoized filtered and sorted data
  const { filteredContributions, summaryStats } = useMemo(() => {
    let filtered = memberContributions

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contrib =>
        contrib.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrib.member.fellowship_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrib.member.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(contrib => {
        switch (filterStatus) {
          case 'active':
            return contrib.months_with_contributions >= 3
          case 'inactive':
            return contrib.months_with_contributions < 3
          case 'missing':
            return contrib.missing_months >= 6
          default:
            return true
        }
      })
    }

    // Sort data
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.member.name.localeCompare(b.member.name)
        case 'total':
          return b.total_amount - a.total_amount
        case 'recent':
          return new Date(b.last_contribution_date).getTime() - new Date(a.last_contribution_date).getTime()
        case 'frequency':
          return b.months_with_contributions - a.months_with_contributions
        default:
          return 0
      }
    })

    // Calculate summary statistics
    const stats = {
      totalContributors: filtered.length,
      totalAmount: filtered.reduce((sum, c) => sum + c.total_amount, 0),
      averageMonthlyContribution: filtered.length > 0 
        ? filtered.reduce((sum, c) => sum + c.average_monthly_amount, 0) / filtered.length 
        : 0,
      activeContributors: filtered.filter(c => c.months_with_contributions >= 3).length
    }

    return { filteredContributions: filtered, summaryStats: stats }
  }, [memberContributions, searchTerm, sortBy, filterStatus])

  const getStatusColor = (contrib: MemberContribution) => {
    if (contrib.months_with_contributions >= 6) return 'bg-green-500'
    if (contrib.months_with_contributions >= 3) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = (contrib: MemberContribution) => {
    if (contrib.months_with_contributions >= 6) return 'Very Active'
    if (contrib.months_with_contributions >= 3) return 'Active'
    return 'Inactive'
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-green-400/25 to-emerald-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Member Contributions
            </h1>
            <p className="text-white/70">Track member giving patterns and contribution analytics</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Total Contributors</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {summaryStats.totalContributors}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 backdrop-blur-sm rounded-xl">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Total Amount</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  <AnimatedCounter value={summaryStats.totalAmount} />
                </p>
              </div>
              <div className="p-3 bg-green-500/20 backdrop-blur-sm rounded-xl">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Average Monthly</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  <AnimatedCounter value={summaryStats.averageMonthlyContribution} />
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>
          <div className="glass-card p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">Active Contributors</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {summaryStats.activeContributors}
                </p>
              </div>
              <div className="p-3 bg-orange-500/20 backdrop-blur-sm rounded-xl">
                <UserCheck className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="glass-card p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
              <SelectTrigger className="glass-input sm:max-w-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="glass-dropdown">
                <SelectItem value="total">Total Amount</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="recent">Recent Activity</SelectItem>
                <SelectItem value="frequency">Frequency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="glass-input sm:max-w-xs">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="glass-dropdown">
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active (3+ months)</SelectItem>
                <SelectItem value="inactive">Inactive (&lt;3 months)</SelectItem>
                <SelectItem value="missing">Missing (6+ months)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Member Contributions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContributions.map((contrib, index) => (
            <Card 
              key={contrib.member.id} 
              className={`glass-card hover:bg-white/15 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4`}
              style={{ animationDelay: `${600 + index * 50}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white/90 flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-white/70" />
                      {contrib.member.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(contrib)} border-0 text-white text-xs`}
                      >
                        {getStatusText(contrib)}
                      </Badge>
                      <span className="text-xs text-white/60">
                        {contrib.contribution_count} contributions
                      </span>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setSelectedMember(contrib)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] glass-card-dark">
                      <DialogHeader>
                        <DialogTitle className="text-white/90 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {contrib.member.name} - Contribution Details
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Member Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                          {contrib.member.fellowship_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-white/70" />
                              <span className="text-white/80">{contrib.member.fellowship_name}</span>
                            </div>
                          )}
                          {contrib.member.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-white/70" />
                              <span className="text-white/80">{contrib.member.phone}</span>
                            </div>
                          )}
                          {contrib.member.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-white/70" />
                              <span className="text-white/80">{contrib.member.location}</span>
                            </div>
                          )}
                          {contrib.member.job && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-white/70" />
                              <span className="text-white/80">{contrib.member.job}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <div className="text-lg font-bold text-white/90">
                              <AnimatedCounter value={contrib.total_amount} />
                            </div>
                            <div className="text-xs text-white/60">Total Amount</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <div className="text-lg font-bold text-white/90">
                              <AnimatedCounter value={contrib.average_monthly_amount} />
                            </div>
                            <div className="text-xs text-white/60">Monthly Average</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <div className="text-lg font-bold text-white/90">
                              {contrib.months_with_contributions}
                            </div>
                            <div className="text-xs text-white/60">Active Months</div>
                          </div>
                        </div>

                        {/* Recent Contributions */}
                        <div>
                          <h4 className="text-white/90 font-medium mb-3">Recent Contributions</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {contrib.contributions.slice(0, 10).map((contribution) => (
                              <div key={contribution.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div>
                                  <div className="text-sm font-medium text-white/90">{contribution.type}</div>
                                  <div className="text-xs text-white/60">
                                    {formatDate(contribution.service_date)} • {contribution.fund_name}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-green-400">
                                  {formatCurrency(contribution.amount)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Amount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white/70">Total Contributions</span>
                    <span className="text-sm font-medium text-white/80">
                      <AnimatedCounter value={contrib.total_amount} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white/90">
                    <AnimatedCounter value={contrib.total_amount} />
                  </div>
                </div>

                {/* Monthly Average */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/70">Monthly Average</span>
                    <span className="text-sm text-white/60">
                      <AnimatedCounter value={contrib.average_monthly_amount} />
                    </span>
                  </div>
                  
                  {/* Activity Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Activity Level</span>
                      <span className="text-white/70">{contrib.months_with_contributions}/12 months</span>
                    </div>
                    <Progress 
                      value={(contrib.months_with_contributions / 12) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Last Contribution */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Last Contribution</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/50" />
                    <span className="text-white/80">
                      {formatDate(contrib.last_contribution_date)}
                    </span>
                  </div>
                </div>

                {/* Missing Months Alert */}
                {contrib.missing_months > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-400/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400">
                      {contrib.missing_months} missing months
                    </span>
                  </div>
                )}

                {/* Member Details */}
                <div className="space-y-1 pt-2 border-t border-white/10">
                  {contrib.member.fellowship_name && (
                    <div className="text-xs text-white/60">
                      Fellowship: {contrib.member.fellowship_name}
                    </div>
                  )}
                  {contrib.member.location && (
                    <div className="text-xs text-white/60">
                      Location: {contrib.member.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContributions.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 font-medium text-lg">No member contributions found</p>
            <p className="text-white/50 text-sm mt-2">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}