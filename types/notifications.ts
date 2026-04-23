export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'transaction' | 'member' | 'offering' | 'bill' | 'system' | 'report' | 'general'
  read: boolean
  action_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

export interface CreateNotificationData {
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  category?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface NotificationApiResponse {
  notifications?: Notification[]
  notification?: Notification
  success?: boolean
  message?: string
  error?: string
  details?: string
}

export interface NotificationAction {
  action: 'markAsRead' | 'markAllAsRead' | 'delete' | 'create' | 'generateAll'
  notificationId?: string
  notificationData?: CreateNotificationData
}

export interface NotificationGenerationType {
  type: 'all' | 'bills' | 'transactions' | 'offerings' | 'advances' | 'cleanup'
}

export interface NotificationSubscriptionCallback {
  (notifications: Notification[]): void
}

export interface NotificationServiceOptions {
  limit?: number
  realtime?: boolean
}