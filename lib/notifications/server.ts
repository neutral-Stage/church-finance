import { createAdminClient } from '@/lib/supabase-server'
import { buildNotificationEmailHtml, sendEmail } from '@/lib/email'
import { shouldSendEmailForCategory, type StoredNotificationPreferences } from '@/lib/notifications/preferences'
import { Notification } from '@/types/notifications'

/**
 * Server-side notification service for admin operations
 * This service uses the admin client and should ONLY be used on the server-side
 * Never import this file in client-side code
 */
export class ServerNotificationService {
  private static _supabase: ReturnType<typeof createAdminClient> | null = null
  // Lazy getter — avoids throwing at class-evaluation time if SUPABASE_SECRET_KEY
  // is not configured yet (e.g. during static analysis or misconfigured env).
  private static get supabase(): ReturnType<typeof createAdminClient> {
    if (!this._supabase) this._supabase = createAdminClient()
    return this._supabase
  }

  /**
   * Generate all types of notifications for all users
   * This calls database functions that handle user filtering internally
   */
  static async generateAllNotifications(): Promise<void> {
    try {
      await Promise.all([
        this.supabase.rpc('generate_bill_due_notifications'),
        this.supabase.rpc('generate_transaction_notifications'),
        this.supabase.rpc('generate_offering_notifications'),
        this.supabase.rpc('generate_advance_notifications')
      ])
    } catch (error) {
      console.error('Error generating all notifications:', error)
      throw new Error(`Failed to generate notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate bill-related notifications
   */
  static async generateBillNotifications(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('generate_bill_due_notifications')
      if (error) throw error
    } catch (error) {
      console.error('Error generating bill notifications:', error)
      throw new Error(`Failed to generate bill notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate transaction-related notifications
   */
  static async generateTransactionNotifications(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('generate_transaction_notifications')
      if (error) throw error
    } catch (error) {
      console.error('Error generating transaction notifications:', error)
      throw new Error(`Failed to generate transaction notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate offering-related notifications
   */
  static async generateOfferingNotifications(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('generate_offering_notifications')
      if (error) throw error
    } catch (error) {
      console.error('Error generating offering notifications:', error)
      throw new Error(`Failed to generate offering notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate advance-related notifications
   */
  static async generateAdvanceNotifications(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('generate_advance_notifications')
      if (error) throw error
    } catch (error) {
      console.error('Error generating advance notifications:', error)
      throw new Error(`Failed to generate advance notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get notifications for a specific user (admin operation)
   * For client-side operations, use the API endpoint instead
   */
  static async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []).filter((n: any) => n.user_id) as Notification[]
    } catch (error) {
      console.error('Error getting user notifications:', error)
      throw new Error(`Failed to get user notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mark notification as read (admin operation)
   * For client-side operations, use the API endpoint instead
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await (this.supabase
        .from('notifications') as any)
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mark all notifications as read for a user (admin operation)
   * For client-side operations, use the API endpoint instead
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await (this.supabase
        .from('notifications') as any)
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a notification (admin operation)
   * For client-side operations, use the API endpoint instead
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   * This is an admin operation that should be run periodically
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())

      if (error) throw error
    } catch (error) {
      console.error('Error cleaning up old notifications:', error)
      throw new Error(`Failed to cleanup old notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a custom notification (admin operation)
   * For client-side operations, use the API endpoint instead
   */
  static async createNotification({
    userId,
    title,
    message,
    type = 'info',
    category = 'general',
    actionUrl,
    metadata
  }: {
    userId: string
    title: string
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    category?: string
    actionUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<Notification> {
    try {
      const { data, error } = await (this.supabase
        .from('notifications') as any)
        .insert({
          user_id: userId,
          title,
          message,
          type,
          category,
          action_url: actionUrl,
          metadata,
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Batch create notifications for multiple users
   * This is an admin operation for system-wide notifications
   */
  /**
   * Generate notifications then deliver pending ones via email (Resend).
   */
  static async generateAndDeliverNotifications(type: 'all' | 'bills' | 'transactions' | 'offerings' | 'advances' = 'all'): Promise<{
    generated: boolean
    emailsSent: number
    emailsSkipped: number
    emailsFailed: number
  }> {
    switch (type) {
      case 'bills':
        await this.generateBillNotifications()
        break
      case 'transactions':
        await this.generateTransactionNotifications()
        break
      case 'offerings':
        await this.generateOfferingNotifications()
        break
      case 'advances':
        await this.generateAdvanceNotifications()
        break
      case 'all':
      default:
        await this.generateAllNotifications()
        break
    }

    const delivery = await this.deliverPendingEmailNotifications()
    return { generated: true, ...delivery }
  }

  /**
   * Send emails for notifications that have not been emailed yet.
   */
  static async deliverPendingEmailNotifications(limit = 100): Promise<{
    emailsSent: number
    emailsSkipped: number
    emailsFailed: number
  }> {
    let emailsSent = 0
    let emailsSkipped = 0
    let emailsFailed = 0

    try {
      const { data: pending, error } = await this.supabase
        .from('notifications')
        .select('id, user_id, title, message, category, action_url, created_at')
        .is('email_sent_at', null)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      if (!pending?.length) {
        return { emailsSent, emailsSkipped, emailsFailed }
      }

      const userIds = [...new Set(pending.map((n) => n.user_id).filter(Boolean))] as string[]

      const [{ data: users }, { data: prefRows }] = await Promise.all([
        this.supabase.from('users').select('id, email, full_name').in('id', userIds),
        this.supabase.from('user_preferences').select('user_id, preferences').in('user_id', userIds),
      ])

      const emailByUser = new Map((users ?? []).map((u) => [u.id, u.email]))
      const prefsByUser = new Map(
        (prefRows ?? []).map((row) => [
          row.user_id,
          row.preferences as StoredNotificationPreferences | null,
        ])
      )

      for (const notification of pending) {
        if (!notification.user_id) {
          emailsSkipped++
          continue
        }

        const prefs = prefsByUser.get(notification.user_id)
        if (!shouldSendEmailForCategory(prefs, notification.category)) {
          await this.markNotificationEmailed(notification.id)
          emailsSkipped++
          continue
        }

        const recipient = emailByUser.get(notification.user_id)
        if (!recipient) {
          emailsSkipped++
          continue
        }

        const result = await sendEmail({
          to: recipient,
          subject: notification.title,
          html: buildNotificationEmailHtml({
            title: notification.title,
            message: notification.message,
            actionUrl: notification.action_url,
          }),
          idempotencyKey: `notification/${notification.id}`,
        })

        if (result.sent) {
          await this.markNotificationEmailed(notification.id)
          emailsSent++
        } else if (result.skipped) {
          emailsSkipped++
        } else {
          emailsFailed++
        }
      }
    } catch (error) {
      console.error('Error delivering notification emails:', error)
      throw new Error(
        `Failed to deliver notification emails: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return { emailsSent, emailsSkipped, emailsFailed }
  }

  private static async markNotificationEmailed(notificationId: string): Promise<void> {
    const { error } = await (this.supabase.from('notifications') as any)
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      console.error('Failed to mark notification as emailed:', error.message)
    }
  }

  static async createBulkNotifications({
    userIds,
    title,
    message,
    type = 'info',
    category = 'system',
    actionUrl,
    metadata
  }: {
    userIds: string[]
    title: string
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    category?: string
    actionUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<Notification[]> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        category,
        action_url: actionUrl,
        metadata,
        read: false,
        created_at: new Date().toISOString()
      }))

      const { data, error } = await (this.supabase
        .from('notifications') as any)
        .insert(notifications)
        .select()

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw new Error(`Failed to create bulk notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export default ServerNotificationService