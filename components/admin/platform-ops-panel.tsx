'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import {
  GlassTable,
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeader,
  GlassTableRow,
} from '@/components/ui/glass-table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AdminLoadingState } from '@/components/admin/AdminLoadingState'
import { AdminErrorState } from '@/components/admin/AdminErrorState'
import {
  Activity,
  Building2,
  PauseCircle,
  PlayCircle,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface PlatformChurch {
  id: string
  name: string
  type: string
  is_active: boolean
  plan_name: string | null
  plan_status: string
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'inactive'
  last_activity_at: string | null
  member_count: number
  total_balance: number
  transactions_last_30_days: number
}

interface PlatformSystemStats {
  total_churches: number
  active_churches: number
  suspended_churches: number
  healthy_churches: number
  at_risk_churches: number
}

function healthBadgeVariant(health: PlatformChurch['health']) {
  switch (health) {
    case 'excellent':
      return 'bg-income/15 text-income border-income/30'
    case 'good':
      return 'bg-primary/15 text-primary border-primary/30'
    case 'fair':
      return 'bg-pending/15 text-pending border-pending/30'
    case 'poor':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function planBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'bg-income/15 text-income border-income/30'
    case 'trial':
      return 'bg-primary/15 text-primary border-primary/30'
    case 'past_due':
      return 'bg-pending/15 text-pending border-pending/30'
    case 'canceled':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function PlatformOpsPanel() {
  const [churches, setChurches] = useState<PlatformChurch[]>([])
  const [stats, setStats] = useState<PlatformSystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { confirm, ConfirmationDialog } = useConfirmationDialog()

  const fetchPlatformData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/platform')
      const data = await response.json()

      if (response.ok) {
        setChurches(data.churches ?? [])
        setStats(data.systemStats ?? null)
        setError('')
      } else if (response.status === 403) {
        setError('Super admin access is required for platform operations.')
      } else {
        setError(data.error ?? 'Failed to load platform data')
      }
    } catch {
      setError('Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlatformData()
  }, [fetchPlatformData])

  const handleStatusChange = async (church: PlatformChurch, action: 'suspend' | 'reactivate') => {
    const confirmed = await confirm({
      title: action === 'suspend' ? 'Suspend Church' : 'Reactivate Church',
      description:
        action === 'suspend'
          ? `Suspend "${church.name}"? Members will lose access until reactivated.`
          : `Reactivate "${church.name}"? Members will regain access.`,
      confirmText: action === 'suspend' ? 'Suspend' : 'Reactivate',
      variant: action === 'suspend' ? 'destructive' : 'default',
      onConfirm: () => {},
    })

    if (!confirmed) return

    setActionLoading(church.id)
    try {
      const response = await fetch('/api/admin/platform', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: church.id, action }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message ?? 'Church status updated')
        await fetchPlatformData()
      } else {
        toast.error(data.error ?? 'Failed to update church status')
      }
    } catch {
      toast.error('Unable to connect to the server')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <AdminLoadingState
        title="Platform Operations"
        description="Loading platform operations..."
      />
    )
  }

  if (error) {
    return <AdminErrorState error={error} onRetry={fetchPlatformData} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Platform Operations</h2>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard variant="primary">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Churches</p>
              <p className="text-2xl font-bold">{stats.total_churches}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="success">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats.active_churches}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="warning">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold">{stats.suspended_churches}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="info">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">Healthy</p>
              <p className="text-2xl font-bold">{stats.healthy_churches}</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard variant="error">
            <GlassCardContent className="p-4">
              <p className="text-sm text-muted-foreground">At Risk</p>
              <p className="text-2xl font-bold">{stats.at_risk_churches}</p>
            </GlassCardContent>
          </GlassCard>
        </div>
      )}

      {stats && stats.at_risk_churches > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.at_risk_churches} church{stats.at_risk_churches !== 1 ? 'es' : ''} need
            attention based on activity and financial health.
          </AlertDescription>
        </Alert>
      )}

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Church Health &amp; Plans
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <GlassTable>
            <GlassTableHeader>
              <GlassTableRow>
                <GlassTableHead>Church</GlassTableHead>
                <GlassTableHead>Health</GlassTableHead>
                <GlassTableHead>Plan</GlassTableHead>
                <GlassTableHead>Last Activity</GlassTableHead>
                <GlassTableHead>Members</GlassTableHead>
                <GlassTableHead>Balance</GlassTableHead>
                <GlassTableHead>Status</GlassTableHead>
                <GlassTableHead className="text-right">Actions</GlassTableHead>
              </GlassTableRow>
            </GlassTableHeader>
            <GlassTableBody>
              {churches.map(church => (
                <GlassTableRow key={church.id}>
                  <GlassTableCell>
                    <div className="font-medium">{church.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{church.type}</div>
                  </GlassTableCell>
                  <GlassTableCell>
                    <Badge variant="outline" className={healthBadgeVariant(church.health)}>
                      {church.health}
                    </Badge>
                  </GlassTableCell>
                  <GlassTableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{church.plan_name ?? 'No plan'}</span>
                      <Badge variant="outline" className={planBadgeVariant(church.plan_status)}>
                        {church.plan_status}
                      </Badge>
                    </div>
                  </GlassTableCell>
                  <GlassTableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      {formatRelativeTime(church.last_activity_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {church.transactions_last_30_days} tx / 30d
                    </div>
                  </GlassTableCell>
                  <GlassTableCell>{church.member_count}</GlassTableCell>
                  <GlassTableCell>{formatCurrency(church.total_balance)}</GlassTableCell>
                  <GlassTableCell>
                    <Badge
                      variant="outline"
                      className={
                        church.is_active
                          ? 'bg-income/15 text-income border-income/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }
                    >
                      {church.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </GlassTableCell>
                  <GlassTableCell className="text-right">
                    {church.is_active ? (
                      <GlassButton
                        variant="error"
                        size="sm"
                        disabled={actionLoading === church.id}
                        onClick={() => handleStatusChange(church, 'suspend')}
                      >
                        <PauseCircle className="w-4 h-4 mr-1" />
                        Suspend
                      </GlassButton>
                    ) : (
                      <GlassButton
                        variant="success"
                        size="sm"
                        disabled={actionLoading === church.id}
                        onClick={() => handleStatusChange(church, 'reactivate')}
                      >
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Reactivate
                      </GlassButton>
                    )}
                  </GlassTableCell>
                </GlassTableRow>
              ))}
            </GlassTableBody>
          </GlassTable>

          {churches.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No churches found</p>
          )}
        </GlassCardContent>
      </GlassCard>

      <ConfirmationDialog />
    </div>
  )
}
