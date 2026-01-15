'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Building2, Users, DollarSign, Search, Download, TrendingUp, TrendingDown, AlertTriangle, Eye, BarChart3, PieChart, Plus, Edit, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ChurchFinancialData {
  id: string
  name: string
  type: string
  is_active: boolean
  created_at: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  established_date: string | null
  funds: {
    total_funds: number
    active_funds: number
    total_balance: number
    total_income: number
    total_expenses: number
    fund_types: Record<string, number>
  }
  recent_activity: {
    transactions_last_30_days: number
    offerings_last_30_days: number
    bills_pending: number
    advances_outstanding: number
  }
  member_count?: number
  user_count?: number
}

interface SystemSummary {
  total_churches: number
  active_churches: number
  total_system_balance: number
  total_system_income: number
  total_system_expenses: number
  total_funds: number
  avg_balance_per_church: number
}

interface ChurchFormData {
  name: string
  type: string
  description: string
  address: string
  phone: string
  email: string
  website: string
  established_date: string
  is_active: boolean
}

export default function ChurchesAdminPage() {
  const [churches, setChurches] = useState<ChurchFinancialData[]>([])
  const [summary, setSummary] = useState<SystemSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedChurch, setSelectedChurch] = useState<ChurchFinancialData | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingChurch, setEditingChurch] = useState<ChurchFinancialData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { confirm, ConfirmationDialog } = useConfirmationDialog()

  const [formData, setFormData] = useState<ChurchFormData>({
    name: '',
    type: 'church',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    established_date: '',
    is_active: true
  })

  const fetchChurchesFinancialData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('active', statusFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/admin/churches/financial?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setChurches(data.churches || [])
        setSummary(data.summary || null)
        setError('')
      } else {
        // Enhanced error handling with specific messages
        if (response.status === 401) {
          setError('Please sign in to access this page')
        } else if (response.status === 403) {
          setError('You do not have administrator privileges. Please contact your system administrator to request access.')
        } else {
          setError(data.error || 'Failed to fetch church financial data')
        }
      }
    } catch (error) {
      console.error('Error fetching church financial data:', error)
      setError('Unable to connect to the server. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, searchTerm])

  useEffect(() => {
    fetchChurchesFinancialData()
  }, [fetchChurchesFinancialData])

  const exportFinancialReport = async () => {
    try {
      const csvContent = generateCSVReport(churches)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `church-financial-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Failed to export report')
    }
  }

  const generateCSVReport = (churches: ChurchFinancialData[]) => {
    const headers = [
      'Church Name', 'Type', 'Status', 'Total Funds', 'Active Funds',
      'Total Balance', 'Total Income', 'Total Expenses', 'Net Position',
      'Recent Transactions', 'Recent Offerings', 'Pending Bills',
      'Outstanding Advances', 'User Count', 'Created Date'
    ]

    const rows = churches.map(church => [
      church.name,
      church.type,
      church.is_active ? 'Active' : 'Inactive',
      church.funds.total_funds,
      church.funds.active_funds,
      church.funds.total_balance.toFixed(2),
      church.funds.total_income.toFixed(2),
      church.funds.total_expenses.toFixed(2),
      (church.funds.total_income - church.funds.total_expenses).toFixed(2),
      church.recent_activity.transactions_last_30_days,
      church.recent_activity.offerings_last_30_days,
      church.recent_activity.bills_pending,
      church.recent_activity.advances_outstanding,
      church.user_count || 0,
      church.created_at ? new Date(church.created_at).toLocaleDateString() : ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const openDetailDialog = (church: ChurchFinancialData) => {
    setSelectedChurch(church)
    setIsDetailDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'church',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      established_date: '',
      is_active: true
    })
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (church: ChurchFinancialData) => {
    setEditingChurch(church)
    setFormData({
      name: church.name,
      type: church.type,
      description: church.description || '',
      address: church.address || '',
      phone: church.phone || '',
      email: church.email || '',
      website: '',
      established_date: church.established_date || '',
      is_active: church.is_active
    })
    setIsEditDialogOpen(true)
  }

  const handleCreateChurch = async () => {
    if (!formData.name.trim() || !formData.type) {
      toast.error('Church name and type are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || null,
          address: formData.address.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
          established_date: formData.established_date || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create church')
      }

      toast.success('Church created successfully')
      setIsCreateDialogOpen(false)
      resetForm()
      fetchChurchesFinancialData()
    } catch (error) {
      console.error('Error creating church:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create church')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditChurch = async () => {
    if (!editingChurch || !formData.name.trim() || !formData.type) {
      toast.error('Church name and type are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/churches/${editingChurch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || null,
          address: formData.address.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
          established_date: formData.established_date || null,
          is_active: formData.is_active
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update church')
      }

      toast.success('Church updated successfully')
      setIsEditDialogOpen(false)
      setEditingChurch(null)
      resetForm()
      fetchChurchesFinancialData()
    } catch (error) {
      console.error('Error updating church:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update church')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteChurch = async (church: ChurchFinancialData) => {
    const confirmed = await confirm({
      title: 'Delete Church',
      description: `Are you sure you want to delete "${church.name}"? This action cannot be undone and will deactivate the church.`,
      variant: 'destructive',
      onConfirm: () => { }
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/churches/${church.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete church')
      }

      toast.success('Church deleted successfully')
      fetchChurchesFinancialData()
    } catch (error) {
      console.error('Error deleting church:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete church'

      // Show specific message for primary church protection
      if (errorMessage.includes('Cannot delete the main church')) {
        toast.error('Cannot delete the primary church. This is the first church in the system and contains essential data.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const filteredAndSortedChurches = churches
    .filter(church => {
      const matchesSearch = !searchTerm ||
        church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        church.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (church.description && church.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = typeFilter === 'all' || church.type === typeFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'true' && church.is_active) ||
        (statusFilter === 'false' && !church.is_active)

      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'balance':
          aValue = a.funds.total_balance
          bValue = b.funds.total_balance
          break
        case 'income':
          aValue = a.funds.total_income
          bValue = b.funds.total_income
          break
        case 'funds':
          aValue = a.funds.total_funds
          bValue = b.funds.total_funds
          break
        case 'activity':
          aValue = a.recent_activity.transactions_last_30_days
          bValue = b.recent_activity.transactions_last_30_days
          break
        case 'created':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default: // name
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'fellowship': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'ministry': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getHealthStatus = (church: ChurchFinancialData) => {
    const netPosition = church.funds.total_income - church.funds.total_expenses
    const hasActivity = church.recent_activity.transactions_last_30_days > 0
    const hasPendingIssues = church.recent_activity.bills_pending > 0 || church.recent_activity.advances_outstanding > 0

    if (netPosition > 0 && hasActivity && !hasPendingIssues) return 'excellent'
    if (netPosition > 0 && hasActivity) return 'good'
    if (netPosition >= 0) return 'fair'
    return 'poor'
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-blue-400'
      case 'fair': return 'text-yellow-400'
      case 'poor': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const isMainChurch = (church: ChurchFinancialData) => {
    // The main church is the oldest (first created) church in the system
    if (churches.length === 0) return false

    const oldestChurch = churches.reduce((oldest, current) =>
      new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
    )

    return oldestChurch.id === church.id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        <span className="ml-3 text-white/70">Loading church financial data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Church Financial Monitor</h1>
          <p className="text-white/70 mt-2">Comprehensive financial oversight for all churches</p>
        </div>

        <div className="flex gap-2">
          <GlassButton variant="success" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Church
          </GlassButton>
          <GlassButton variant="primary" onClick={exportFinancialReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </GlassButton>
        </div>
      </div>

      {/* System Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="primary">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-white/70 text-sm">Total Churches</p>
                <p className="text-2xl font-bold text-white">{summary.total_churches}</p>
                <p className="text-xs text-green-400">{summary.active_churches} active</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-400" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="success">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-white/70 text-sm">System Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_system_balance)}</p>
                <p className="text-xs text-green-400">Across {summary.total_funds} funds</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="info">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-white/70 text-sm">Total Income</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_system_income)}</p>
                <p className="text-xs text-blue-400">All time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="warning">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-white/70 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_system_expenses)}</p>
                <p className="text-xs text-yellow-400">All time</p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-400" />
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      {/* Filters and Search */}
      <GlassCard>
        <GlassCardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="Search churches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:border-white/30"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="church">Church</SelectItem>
                <SelectItem value="fellowship">Fellowship</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="funds">Fund Count</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Churches Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedChurches.map((church) => {
          const healthStatus = getHealthStatus(church)
          const netPosition = church.funds.total_income - church.funds.total_expenses

          return (
            <GlassCard key={church.id} variant="default" animation="fadeIn" className="hover:scale-[1.02]">
              <GlassCardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <GlassCardTitle className="text-lg">{church.name}</GlassCardTitle>
                    <div className="flex gap-2">
                      <Badge className={getTypeColor(church.type)}>{church.type}</Badge>
                      <Badge className={getStatusColor(church.is_active)}>
                        {church.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {isMainChurch(church) && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <GlassButton
                      variant="info"
                      size="sm"
                      onClick={() => openDetailDialog(church)}
                    >
                      <Eye className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton
                      variant="warning"
                      size="sm"
                      onClick={() => openEditDialog(church)}
                    >
                      <Edit className="w-4 h-4" />
                    </GlassButton>
                    {!isMainChurch(church) && (
                      <GlassButton
                        variant="error"
                        size="sm"
                        onClick={() => handleDeleteChurch(church)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </GlassButton>
                    )}
                  </div>
                </div>

                {/* Financial Health Indicator */}
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(healthStatus).replace('text-', 'bg-')}`}></div>
                  <span className={`text-xs ${getHealthColor(healthStatus)}`}>
                    Financial Health: {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
                  </span>
                </div>
              </GlassCardHeader>

              <GlassCardContent className="space-y-4">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-slate-800/50 rounded">
                    <p className="text-xs text-gray-400">Total Balance</p>
                    <p className="text-sm font-bold text-green-400">{formatCurrency(church.funds.total_balance)}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-800/50 rounded">
                    <p className="text-xs text-gray-400">Funds</p>
                    <p className="text-sm font-bold text-blue-400">{church.funds.total_funds}</p>
                  </div>
                </div>

                {/* Net Position */}
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                  <span className="text-xs text-gray-400">Net Position:</span>
                  <span className={`text-sm font-bold ${netPosition > 0 ? 'text-green-400' : netPosition < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                    {formatCurrency(netPosition)}
                  </span>
                </div>

                {/* Activity Summary */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Recent Activity (30d):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transactions:</span>
                      <span className="text-white">{church.recent_activity.transactions_last_30_days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Offerings:</span>
                      <span className="text-white">{church.recent_activity.offerings_last_30_days}</span>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {(church.recent_activity.bills_pending > 0 || church.recent_activity.advances_outstanding > 0) && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <div className="text-xs text-yellow-400">
                      {church.recent_activity.bills_pending > 0 && `${church.recent_activity.bills_pending} pending bills`}
                      {church.recent_activity.bills_pending > 0 && church.recent_activity.advances_outstanding > 0 && ', '}
                      {church.recent_activity.advances_outstanding > 0 && `${church.recent_activity.advances_outstanding} outstanding advances`}
                    </div>
                  </div>
                )}
              </GlassCardContent>

              <GlassCardFooter className="flex justify-between items-center pt-3 border-t border-slate-600">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  {church.user_count || 0} users
                </div>
                <span className="text-xs text-gray-500">
                  {church.created_at ? new Date(church.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </GlassCardFooter>
            </GlassCard>
          )
        })}
      </div>

      {filteredAndSortedChurches.length === 0 && (
        <GlassCard variant="default" className="text-center py-8">
          <GlassCardContent>
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? 'No churches match your filters' : 'No churches found'}
            </h3>
            <p className="text-gray-400">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search terms or filters'
                : 'No churches are available in the system'
              }
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Church Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedChurch?.name} - Financial Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive financial overview and activity details
            </DialogDescription>
          </DialogHeader>

          {selectedChurch && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="funds">Funds</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <GlassCard variant="success">
                    <GlassCardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Total Balance</p>
                          <p className="text-xl font-bold text-green-400">
                            {formatCurrency(selectedChurch.funds.total_balance)}
                          </p>
                        </div>
                        <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                    </GlassCardContent>
                  </GlassCard>

                  <GlassCard variant="info">
                    <GlassCardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Total Income</p>
                          <p className="text-xl font-bold text-blue-400">
                            {formatCurrency(selectedChurch.funds.total_income)}
                          </p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                      </div>
                    </GlassCardContent>
                  </GlassCard>

                  <GlassCard variant="warning">
                    <GlassCardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Total Expenses</p>
                          <p className="text-xl font-bold text-yellow-400">
                            {formatCurrency(selectedChurch.funds.total_expenses)}
                          </p>
                        </div>
                        <TrendingDown className="w-6 h-6 text-yellow-400" />
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassCard>
                    <GlassCardHeader>
                      <GlassCardTitle>Fund Overview</GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Funds:</span>
                        <span className="text-white">{selectedChurch.funds.total_funds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Funds:</span>
                        <span className="text-green-400">{selectedChurch.funds.active_funds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Net Position:</span>
                        <span className={(
                          selectedChurch.funds.total_income - selectedChurch.funds.total_expenses
                        ) > 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(selectedChurch.funds.total_income - selectedChurch.funds.total_expenses)}
                        </span>
                      </div>
                    </GlassCardContent>
                  </GlassCard>

                  <GlassCard>
                    <GlassCardHeader>
                      <GlassCardTitle>Recent Activity (30 days)</GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions:</span>
                        <span className="text-white">{selectedChurch.recent_activity.transactions_last_30_days}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Offerings:</span>
                        <span className="text-white">{selectedChurch.recent_activity.offerings_last_30_days}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pending Bills:</span>
                        <span className={selectedChurch.recent_activity.bills_pending > 0 ? 'text-yellow-400' : 'text-white'}>
                          {selectedChurch.recent_activity.bills_pending}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Outstanding Advances:</span>
                        <span className={selectedChurch.recent_activity.advances_outstanding > 0 ? 'text-red-400' : 'text-white'}>
                          {selectedChurch.recent_activity.advances_outstanding}
                        </span>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                </div>
              </TabsContent>

              <TabsContent value="funds" className="space-y-4 mt-4">
                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Fund Distribution by Type</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    {Object.keys(selectedChurch.funds.fund_types).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(selectedChurch.funds.fund_types).map(([type, amount]) => {
                          const percentage = selectedChurch.funds.total_balance > 0
                            ? (amount / selectedChurch.funds.total_balance) * 100
                            : 0
                          return (
                            <div key={type} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400 capitalize">{type}:</span>
                                <span className="text-white">{formatCurrency(amount)} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-4">No fund data available</p>
                    )}
                  </GlassCardContent>
                </GlassCard>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassCard variant="info">
                    <GlassCardHeader>
                      <GlassCardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Transaction Activity
                      </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <div className="text-center py-6">
                        <div className="text-2xl font-bold text-blue-400">
                          {selectedChurch.recent_activity.transactions_last_30_days}
                        </div>
                        <p className="text-gray-400 text-sm">Transactions in last 30 days</p>
                      </div>
                    </GlassCardContent>
                  </GlassCard>

                  <GlassCard variant="success">
                    <GlassCardHeader>
                      <GlassCardTitle className="flex items-center gap-2">
                        <PieChart className="w-4 h-4" />
                        Offering Activity
                      </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <div className="text-center py-6">
                        <div className="text-2xl font-bold text-green-400">
                          {selectedChurch.recent_activity.offerings_last_30_days}
                        </div>
                        <p className="text-gray-400 text-sm">Offerings in last 30 days</p>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                </div>

                {(selectedChurch.recent_activity.bills_pending > 0 || selectedChurch.recent_activity.advances_outstanding > 0) && (
                  <GlassCard variant="warning">
                    <GlassCardHeader>
                      <GlassCardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Action Items
                      </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-2">
                      {selectedChurch.recent_activity.bills_pending > 0 && (
                        <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                          <span className="text-yellow-400">Pending Bills</span>
                          <span className="text-yellow-400 font-bold">{selectedChurch.recent_activity.bills_pending}</span>
                        </div>
                      )}
                      {selectedChurch.recent_activity.advances_outstanding > 0 && (
                        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded">
                          <span className="text-red-400">Outstanding Advances</span>
                          <span className="text-red-400 font-bold">{selectedChurch.recent_activity.advances_outstanding}</span>
                        </div>
                      )}
                    </GlassCardContent>
                  </GlassCard>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Church Information</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Name</Label>
                        <p className="text-white">{selectedChurch.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Type</Label>
                        <p className="text-white capitalize">{selectedChurch.type}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Status</Label>
                        <p className={selectedChurch.is_active ? 'text-green-400' : 'text-red-400'}>
                          {selectedChurch.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">User Count</Label>
                        <p className="text-white">{selectedChurch.user_count || 0}</p>
                      </div>
                      {selectedChurch.established_date && (
                        <div>
                          <Label className="text-gray-400">Established</Label>
                          <p className="text-white">{new Date(selectedChurch.established_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-gray-400">Created</Label>
                        <p className="text-white">{new Date(selectedChurch.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {selectedChurch.description && (
                      <div className="mt-4">
                        <Label className="text-gray-400">Description</Label>
                        <p className="text-white mt-1">{selectedChurch.description}</p>
                      </div>
                    )}

                    {selectedChurch.address && (
                      <div className="mt-4">
                        <Label className="text-gray-400">Address</Label>
                        <p className="text-white mt-1">{selectedChurch.address}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {selectedChurch.phone && (
                        <div>
                          <Label className="text-gray-400">Phone</Label>
                          <p className="text-white">{selectedChurch.phone}</p>
                        </div>
                      )}
                      {selectedChurch.email && (
                        <div>
                          <Label className="text-gray-400">Email</Label>
                          <p className="text-white">{selectedChurch.email}</p>
                        </div>
                      )}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Church Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Church
            </DialogTitle>
            <DialogDescription>
              Add a new church to the system. The creator will automatically receive admin access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Church Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter church name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="fellowship">Fellowship</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the church"
                className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Church address"
                className="bg-slate-700 border-slate-600 text-white min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="Website URL"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="established_date">Established Date</Label>
                <Input
                  id="established_date"
                  type="date"
                  value={formData.established_date}
                  onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <GlassButton
              variant="secondary"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleCreateChurch}
              disabled={submitting || !formData.name.trim() || !formData.type}
            >
              {submitting ? 'Creating...' : 'Create Church'}
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Church Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Church: {editingChurch?.name}
              {editingChurch && isMainChurch(editingChurch) && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">
                  Primary
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingChurch && isMainChurch(editingChurch) ? (
                <>
                  Update the primary church information and settings.
                  <span className="text-purple-300 font-medium">
                    {' '}Note: The primary church cannot be deleted as it contains essential system data.
                  </span>
                </>
              ) : (
                'Update church information and settings.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Church Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter church name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="fellowship">Fellowship</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the church"
                className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Church address"
                className="bg-slate-700 border-slate-600 text-white min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="Website URL"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-established_date">Established Date</Label>
                <Input
                  id="edit-established_date"
                  type="date"
                  value={formData.established_date}
                  onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-slate-600 bg-slate-700"
              />
              <Label htmlFor="edit-is_active">Church is active</Label>
            </div>
          </div>

          <DialogFooter>
            <GlassButton
              variant="secondary"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleEditChurch}
              disabled={submitting || !formData.name.trim() || !formData.type}
            >
              {submitting ? 'Updating...' : 'Update Church'}
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Access Error</p>
              <p>{error}</p>
              {error.includes('administrator privileges') && (
                <div className="mt-3 text-sm">
                  <p className="font-medium">To resolve this issue:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                    <li>Ensure you have the correct role assigned (super_admin or church_admin)</li>
                    <li>Check that your account is active and has not expired</li>
                    <li>Contact your system administrator to review your permissions</li>
                  </ul>
                </div>
              )}
              {error.includes('sign in') && (
                <div className="mt-3 text-sm">
                  <p>Please <a href="/auth/login" className="underline text-red-200 hover:text-red-100">sign in</a> to continue.</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}