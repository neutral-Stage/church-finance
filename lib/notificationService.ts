import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export class NotificationService {
  /**
   * Generate all types of notifications for a specific user
   */
  static async generateAllNotifications() {
    try {
      // Generate notifications for all users - functions handle user filtering internally
      await Promise.all([
        supabase.rpc('generate_bill_due_notifications'),
        supabase.rpc('generate_transaction_notifications'),
        supabase.rpc('generate_offering_notifications'),
        supabase.rpc('generate_advance_notifications')
      ])
      
    } catch (error) {
      throw error
    }
  }

  /**
   * Generate bill-related notifications
   */
  static async generateBillNotifications() {
    try {
      const { error } = await supabase.rpc('generate_bill_due_notifications')
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Generate transaction-related notifications
   */
  static async generateTransactionNotifications() {
    try {
      const { error } = await supabase.rpc('generate_transaction_notifications')
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Generate offering-related notifications
   */
  static async generateOfferingNotifications() {
    try {
      const { error } = await supabase.rpc('generate_offering_notifications')
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Generate advance-related notifications
   */
  static async generateAdvanceNotifications() {
    try {
      const { error } = await supabase.rpc('generate_advance_notifications')
      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Get notifications for a specific user
   */
  static async getUserNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      throw error
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())

      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Create a custom notification
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
  }) {
    try {
      const { data, error } = await supabase
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
      throw error
    }
  }
}

export default NotificationService