'use client'

import {
  GlassCard,
  GlassCardContent,
  GlassCardFooter,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react'
import {
  formatChurchCurrency,
  getHealthColor,
  getHealthStatus,
  getStatusColor,
  getTypeColor,
  isMainChurch,
  type ChurchFinancialData,
} from './church-types'

interface ChurchListProps {
  churches: ChurchFinancialData[]
  allChurches: ChurchFinancialData[]
  onView: (church: ChurchFinancialData) => void
  onEdit: (church: ChurchFinancialData) => void
  onDelete: (church: ChurchFinancialData) => void
}

export function ChurchList({
  churches,
  allChurches,
  onView,
  onEdit,
  onDelete,
}: ChurchListProps) {
  if (churches.length === 0) {
    return (
      <GlassCard variant="default" className="py-8 text-center">
        <GlassCardContent>
          <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium text-foreground">No churches found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {churches.map((church) => {
        const healthStatus = getHealthStatus(church)
        const netPosition = church.funds.total_income - church.funds.total_expenses
        const mainChurch = isMainChurch(church, allChurches)

        return (
          <GlassCard
            key={church.id}
            variant="default"
            animation="fadeIn"
            className="hover:scale-[1.02]"
          >
            <GlassCardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <GlassCardTitle className="text-lg">{church.name}</GlassCardTitle>
                  <div className="flex gap-2">
                    <Badge className={getTypeColor(church.type)}>{church.type}</Badge>
                    <Badge className={getStatusColor(church.is_active)}>
                      {church.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {mainChurch && (
                      <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300">
                        Primary
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <GlassButton
                    variant="info"
                    size="sm"
                    aria-label="View church details"
                    onClick={() => onView(church)}
                  >
                    <Eye className="h-4 w-4" />
                  </GlassButton>
                  <GlassButton
                    variant="warning"
                    size="sm"
                    aria-label="Edit church"
                    onClick={() => onEdit(church)}
                  >
                    <Edit className="h-4 w-4" />
                  </GlassButton>
                  {!mainChurch && (
                    <GlassButton
                      variant="error"
                      size="sm"
                      aria-label="Delete church"
                      onClick={() => onDelete(church)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </GlassButton>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getHealthColor(healthStatus).replace('text-', 'bg-')}`}
                />
                <span className={`text-xs ${getHealthColor(healthStatus)}`}>
                  Financial Health: {healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
                </span>
              </div>
            </GlassCardHeader>

            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded bg-muted/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                  <p className="text-sm font-bold text-income">
                    {formatChurchCurrency(church.funds.total_balance)}
                  </p>
                </div>
                <div className="rounded bg-muted/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Funds</p>
                  <p className="text-sm font-bold text-primary">{church.funds.total_funds}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">Net Position:</span>
                <span
                  className={`text-sm font-bold ${
                    netPosition > 0
                      ? 'text-income'
                      : netPosition < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {formatChurchCurrency(netPosition)}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recent Activity (30d):</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="text-foreground">
                      {church.recent_activity.transactions_last_30_days}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Offerings:</span>
                    <span className="text-foreground">
                      {church.recent_activity.offerings_last_30_days}
                    </span>
                  </div>
                </div>
              </div>

              {(church.recent_activity.bills_pending > 0 ||
                church.recent_activity.advances_outstanding > 0) && (
                <div className="flex items-center gap-2 rounded border border-pending/30 bg-pending/15 p-2">
                  <AlertTriangle className="h-4 w-4 text-pending" />
                  <div className="text-xs text-pending">
                    {church.recent_activity.bills_pending > 0 &&
                      `${church.recent_activity.bills_pending} pending bills`}
                    {church.recent_activity.bills_pending > 0 &&
                      church.recent_activity.advances_outstanding > 0 &&
                      ', '}
                    {church.recent_activity.advances_outstanding > 0 &&
                      `${church.recent_activity.advances_outstanding} outstanding advances`}
                  </div>
                </div>
              )}
            </GlassCardContent>

            <GlassCardFooter className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {church.user_count || 0} users
              </div>
              <span className="text-xs text-muted-foreground">
                {church.created_at
                  ? new Date(church.created_at).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </GlassCardFooter>
          </GlassCard>
        )
      })}
    </div>
  )
}
