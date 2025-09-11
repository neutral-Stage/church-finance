import { createAdminClient } from '@/lib/supabase-server'
import { Notification } from '@/types/notifications'

/**
 * Server-side notification service for admin operations
 * This service uses the admin client and should ONLY be used on the server-side
 * Never import this file in client-side code
 */
export class ServerNotificationService {
  private static supabase = createAdminClient()

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
      return data || []
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
      const { error } = await this.supabase
        .from('notifications')
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
      const { error } = await this.supabase
        .from('notifications')
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
      const { data, error } = await this.supabase
        .from('notifications')
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

      const { data, error } = await this.supabase
        .from('notifications')
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