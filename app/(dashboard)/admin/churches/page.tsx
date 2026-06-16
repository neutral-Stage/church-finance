'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, DollarSign, Search, Download, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Plus, Edit, Shield } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlatformOpsPanel } from '@/components/admin/platform-ops-panel'
import { ChurchList } from '@/components/admin/church-list'
import { ChurchDetailDrawer } from '@/components/admin/church-detail-drawer'
import { formatChurchCurrency, isMainChurch, type ChurchFinancialData } from '@/components/admin/church-types'

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
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingChurch, setEditingChurch] = useState<ChurchFinancialData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pageView, setPageView] = useState<'financial' | 'platform'>('financial')
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

  const openDetailDrawer = (church: ChurchFinancialData) => {
    setSelectedChurch(church)
    setIsDetailDrawerOpen(true)
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
      onConfirm: () => {}
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

  const getMainChurch = (church: ChurchFinancialData) => isMainChurch(church, churches)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading church financial data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Church Financial Monitor</h1>
          <p className="text-muted-foreground mt-2">Comprehensive financial oversight for all churches</p>
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

      {/* View Toggle */}
      <Tabs value={pageView} onValueChange={(v) => setPageView(v as 'financial' | 'platform')}>
        <TabsList>
          <TabsTrigger value="financial">
            <BarChart3 className="w-4 h-4 mr-2" />
            Financial Monitor
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Shield className="w-4 h-4 mr-2" />
            Platform Ops
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-6">
          <PlatformOpsPanel />
        </TabsContent>

        <TabsContent value="financial" className="mt-6 space-y-6">
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="primary">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-muted-foreground text-sm">Total Churches</p>
                <p className="text-2xl font-bold text-foreground">{summary.total_churches}</p>
                <p className="text-xs text-income">{summary.active_churches} active</p>
              </div>
              <Building2 className="w-8 h-8 text-primary" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="success">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-muted-foreground text-sm">System Balance</p>
                <p className="text-2xl font-bold text-foreground">{formatChurchCurrency(summary.total_system_balance)}</p>
                <p className="text-xs text-income">Across {summary.total_funds} funds</p>
              </div>
              <DollarSign className="w-8 h-8 text-income" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="info">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-muted-foreground text-sm">Total Income</p>
                <p className="text-2xl font-bold text-foreground">{formatChurchCurrency(summary.total_system_income)}</p>
                <p className="text-xs text-primary">All time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="warning">
            <GlassCardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-muted-foreground text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">{formatChurchCurrency(summary.total_system_expenses)}</p>
                <p className="text-xs text-pending">All time</p>
              </div>
              <TrendingDown className="w-8 h-8 text-pending" />
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      {/* Filters and Search */}
      <GlassCard>
        <GlassCardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
              <Input
                placeholder="Search churches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
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
              <SelectTrigger>
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

      <ChurchList
        churches={filteredAndSortedChurches}
        allChurches={churches}
        onView={openDetailDrawer}
        onEdit={openEditDialog}
        onDelete={handleDeleteChurch}
      />
        </TabsContent>
      </Tabs>

      <ChurchDetailDrawer
        church={selectedChurch}
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
      />

      {/* Create Church Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                  placeholder="Enter church name"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
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
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Church address"
                className="min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="Website URL"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="established_date">Established Date</Label>
                <Input
                  id="established_date"
                  type="date"
                  value={formData.established_date}
                  onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}                />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Church: {editingChurch?.name}
              {editingChurch && getMainChurch(editingChurch) && (
                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 ml-2">
                  Primary
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingChurch && getMainChurch(editingChurch) ? (
                <>
                  Update the primary church information and settings.
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
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
                  placeholder="Enter church name"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
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
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Church address"
                className="min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="Website URL"                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-established_date">Established Date</Label>
                <Input
                  id="edit-established_date"
                  type="date"
                  value={formData.established_date}
                  onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-border bg-background"
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
                  <p>Please <a href="/auth/login" className="underline font-medium hover:opacity-80">sign in</a> to continue.</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}