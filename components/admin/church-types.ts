export interface ChurchFinancialData {
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

export function formatChurchCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getTypeColor(type: string) {
  switch (type) {
    case 'church':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
    case 'fellowship':
      return 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30'
    case 'ministry':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function getStatusColor(isActive: boolean) {
  return isActive
    ? 'bg-income/15 text-income border-income/30'
    : 'bg-destructive/15 text-destructive border-destructive/30'
}

export function getHealthStatus(church: ChurchFinancialData) {
  const netPosition = church.funds.total_income - church.funds.total_expenses
  const hasActivity = church.recent_activity.transactions_last_30_days > 0
  const hasPendingIssues =
    church.recent_activity.bills_pending > 0 ||
    church.recent_activity.advances_outstanding > 0

  if (netPosition > 0 && hasActivity && !hasPendingIssues) return 'excellent'
  if (netPosition > 0 && hasActivity) return 'good'
  if (netPosition >= 0) return 'fair'
  return 'poor'
}

export function getHealthColor(status: string) {
  switch (status) {
    case 'excellent':
      return 'text-income'
    case 'good':
      return 'text-primary'
    case 'fair':
      return 'text-pending'
    case 'poor':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

export function isMainChurch(church: ChurchFinancialData, churches: ChurchFinancialData[]) {
  if (churches.length === 0) return false
  const oldestChurch = churches.reduce((oldest, current) =>
    new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
  )
  return oldestChurch.id === church.id
}
