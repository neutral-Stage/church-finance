'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'

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
  Eye,
  Download,
  FileText,
} from 'lucide-react'
import type { MemberContribution } from '@/lib/server-data'
import { useChurch } from '@/contexts/ChurchContext'
import {
  buildGivingStatementInput,
  downloadGivingStatementPdf,
  downloadBatchGivingStatements,
} from '@/lib/giving-statements'
import { toast } from 'sonner'

interface MemberContributionsClientProps {
  initialData: MemberContribution[]
}

export default function MemberContributionsClient({ initialData }: MemberContributionsClientProps) {
  const [memberContributions] = useState<MemberContribution[]>(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'recent' | 'frequency'>('total')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'missing'>('all')
  const [statementYear, setStatementYear] = useState(String(new Date().getFullYear()))
  const [exportingBatch, setExportingBatch] = useState(false)
  const { selectedChurch } = useChurch()

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

  const getStatusColor = useCallback((contrib: MemberContribution) => {
    if (contrib.months_with_contributions >= 6) return 'bg-income/15 text-income border-income/30'
    if (contrib.months_with_contributions >= 3) return 'bg-pending/15 text-pending border-pending/30'
    return 'bg-destructive/15 text-destructive border-destructive/30'
  }, [])

  const getStatusText = useCallback((contrib: MemberContribution) => {
    if (contrib.months_with_contributions >= 6) return 'Very Active'
    if (contrib.months_with_contributions >= 3) return 'Active'
    return 'Inactive'
  }, [])

  const handleDownloadStatement = useCallback(
    (contrib: MemberContribution) => {
      const year = parseInt(statementYear, 10)
      const input = buildGivingStatementInput(
        contrib,
        selectedChurch?.name || 'Church',
        year
      )
      if (input.contributions.length === 0) {
        toast.error(`No contributions found for ${year}`)
        return
      }
      downloadGivingStatementPdf(input)
      toast.success(`Statement downloaded for ${contrib.member.name}`)
    },
    [selectedChurch?.name, statementYear]
  )

  const handleBatchExport = useCallback(async () => {
    const year = parseInt(statementYear, 10)
    const withContributions = filteredContributions.filter((c) =>
      c.contributions.some((ct) => ct.service_date.startsWith(String(year)))
    )
    if (withContributions.length === 0) {
      toast.error(`No contributions found for ${year}`)
      return
    }
    setExportingBatch(true)
    try {
      await downloadBatchGivingStatements(
        withContributions,
        selectedChurch?.name || 'Church',
        year
      )
      toast.success(`Exported ${withContributions.length} giving statements`)
    } finally {
      setExportingBatch(false)
    }
  }, [filteredContributions, selectedChurch?.name, statementYear])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Member Contributions
            </h1>
            <p className="text-muted-foreground">Track member giving patterns and contribution analytics</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="statement-year" className="text-sm text-muted-foreground">Year</Label>
              <Select value={statementYear} onValueChange={setStatementYear}>
                <SelectTrigger id="statement-year" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((offset) => {
                    const y = String(new Date().getFullYear() - offset)
                    return <SelectItem key={y} value={y}>{y}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => void handleBatchExport()}
              disabled={exportingBatch}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingBatch ? 'Exporting...' : 'Batch Export PDFs'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contributors</p>
                <p className="text-2xl font-bold text-foreground">
                  {summaryStats.totalContributors}
                </p>
              </div>
              <div className="p-3 bg-primary/15 rounded-xl">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-income">
                  <AnimatedCounter value={summaryStats.totalAmount} />
                </p>
              </div>
              <div className="p-3 bg-income/15 rounded-xl">
                <DollarSign className="h-8 w-8 text-income" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Monthly</p>
                <p className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={summaryStats.averageMonthlyContribution} />
                </p>
              </div>
              <div className="p-3 bg-purple-500/15 rounded-xl">
                <TrendingUp className="h-8 w-8 text-purple-700 dark:text-purple-300" />
              </div>
            </div>
          </Card>
          <Card className="p-6 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Contributors</p>
                <p className="text-2xl font-bold text-foreground">
                  {summaryStats.activeContributors}
                </p>
              </div>
              <div className="p-3 bg-pending/15 rounded-xl">
                <UserCheck className="h-8 w-8 text-pending" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="p-6 mb-8 animate-fade-in animate-slide-in-from-bottom-4" style={{ animationDelay: '0.5s' }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total Amount</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="recent">Recent Activity</SelectItem>
                <SelectItem value="frequency">Frequency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
              <SelectTrigger className="sm:max-w-xs">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active (3+ months)</SelectItem>
                <SelectItem value="inactive">Inactive (&lt;3 months)</SelectItem>
                <SelectItem value="missing">Missing (6+ months)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Member Contributions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredContributions.map((contrib, index) => (
            <Card 
              key={contrib.member.id} 
              className={`hover:bg-accent/50 transition-all duration-300 hover:scale-105 animate-fade-in animate-slide-in-from-bottom-4`}
              style={{ animationDelay: `${600 + index * 50}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      {contrib.member.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(contrib)} text-xs`}
                      >
                        {getStatusText(contrib)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {contrib.contribution_count} contributions
                      </span>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        aria-label={`View ${contrib.member.name} contribution details`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {contrib.member.name} - Contribution Details
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Member Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                          {contrib.member.fellowship_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{contrib.member.fellowship_name}</span>
                            </div>
                          )}
                          {contrib.member.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{contrib.member.phone}</span>
                            </div>
                          )}
                          {contrib.member.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{contrib.member.location}</span>
                            </div>
                          )}
                          {contrib.member.job && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{contrib.member.job}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold text-foreground">
                              <AnimatedCounter value={contrib.total_amount} />
                            </div>
                            <div className="text-xs text-muted-foreground">Total Amount</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold text-foreground">
                              <AnimatedCounter value={contrib.average_monthly_amount} />
                            </div>
                            <div className="text-xs text-muted-foreground">Monthly Average</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold text-foreground">
                              {contrib.months_with_contributions}
                            </div>
                            <div className="text-xs text-muted-foreground">Active Months</div>
                          </div>
                        </div>

                        {/* Giving History */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-foreground font-medium">Giving History ({statementYear})</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadStatement(contrib)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Download Statement
                          </Button>
                        </div>
                        <div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {contrib.contributions.slice(0, 10).map((contribution) => (
                              <div key={contribution.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                  <div className="text-sm font-medium text-foreground">{contribution.type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(contribution.service_date)} • {contribution.fund_name}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-income">
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
                    <span className="text-sm text-muted-foreground">Total Contributions</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      <AnimatedCounter value={contrib.total_amount} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    <AnimatedCounter value={contrib.total_amount} />
                  </div>
                </div>

                {/* Monthly Average */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Monthly Average</span>
                    <span className="text-sm text-muted-foreground">
                      <AnimatedCounter value={contrib.average_monthly_amount} />
                    </span>
                  </div>
                  
                  {/* Activity Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Activity Level</span>
                      <span className="text-muted-foreground">{contrib.months_with_contributions}/12 months</span>
                    </div>
                    <Progress 
                      value={(contrib.months_with_contributions / 12) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Last Contribution */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Contribution</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatDate(contrib.last_contribution_date)}
                    </span>
                  </div>
                </div>

                {/* Missing Months Alert */}
                {contrib.missing_months > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-pending/15 border border-pending/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-pending" />
                    <span className="text-xs text-pending">
                      {contrib.missing_months} missing months
                    </span>
                  </div>
                )}

                {/* Member Details */}
                <div className="space-y-1 pt-2 border-t border-border">
                  {contrib.member.fellowship_name && (
                    <div className="text-xs text-muted-foreground">
                      Fellowship: {contrib.member.fellowship_name}
                    </div>
                  )}
                  {contrib.member.location && (
                    <div className="text-xs text-muted-foreground">
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
            <Users className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg">No member contributions found</p>
            <p className="text-muted-foreground text-sm mt-2">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}