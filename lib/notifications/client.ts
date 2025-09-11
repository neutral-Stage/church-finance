'use client'

import { supabase } from '@/lib/supabase'
import { 
  Notification, 
  NotificationApiResponse, 
  CreateNotificationData, 
  NotificationSubscriptionCallback,
  NotificationServiceOptions 
} from '@/types/notifications'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Client-side notification service for API calls and realtime subscriptions
 * This service should ONLY be used on the client-side and communicates via API endpoints
 * Never imports server-side admin clients
 */
export class ClientNotificationService {
  private static subscriptions: Map<string, RealtimeChannel> = new Map()
  private static cache: Map<string, { data: Notification[], timestamp: number }> = new Map()
  private static readonly CACHE_TTL = 30000 // 30 seconds

  /**
   * Get notifications for the current user via API
   */
  static async getUserNotifications(options: NotificationServiceOptions = {}): Promise<Notification[]> {
    const { limit = 20 } = options
    
    try {
      // Check cache first
      const cacheKey = `notifications_${limit}`
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data
      }

      const response = await fetch(`/api/notifications?limit=${limit}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const notifications = data.notifications || []
      
      // Update cache
      this.cache.set(cacheKey, { data: notifications, timestamp: Date.now() })
      
      return notifications
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw new Error(`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mark notification as read via API
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'markAsRead', 
          notificationId 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Clear cache to force refresh
      this.clearCache()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mark all notifications as read via API
   */
  static async markAllAsRead(): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'markAllAsRead' })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Clear cache to force refresh
      this.clearCache()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a notification via API
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'delete', 
          notificationId 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Clear cache to force refresh
      this.clearCache()
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a custom notification via API
   */
  static async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'create', 
          notificationData 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.notification) {
        throw new Error('No notification returned from API')
      }

      // Clear cache to force refresh
      this.clearCache()
      
      return data.notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Subscribe to real-time notification updates for the current user
   */
  static subscribeToNotifications(
    userId: string, 
    callback: NotificationSubscriptionCallback
  ): () => void {
    const subscriptionKey = `notifications_${userId}`
    
    // Clean up existing subscription if any
    this.unsubscribe(subscriptionKey)
    
    try {
      const channel = supabase
        .channel(subscriptionKey)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, async (payload) => {
          console.log('Notification change received:', payload)
          
          try {
            // Clear cache and fetch fresh data
            this.clearCache()
            const notifications = await this.getUserNotifications()
            callback(notifications)
          } catch (error) {
            console.error('Error handling notification update:', error)
          }
        })
        .subscribe()

      this.subscriptions.set(subscriptionKey, channel)
      
      // Return cleanup function
      return () => this.unsubscribe(subscriptionKey)
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      throw new Error(`Failed to subscribe to notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  static unsubscribe(subscriptionKey: string): void {
    const subscription = this.subscriptions.get(subscriptionKey)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
    }
  }

  /**
   * Unsubscribe from all real-time updates
   */
  static unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get unread notification count from cached data
   */
  static getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(n => !n.read).length
  }

  /**
   * Generate notifications via API (for testing or manual triggering)
   * This calls the server-side generation functions
   */
  static async generateNotifications(): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'generateAll' })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: NotificationApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Clear cache to force refresh
      this.clearCache()
    } catch (error) {
      console.error('Error generating notifications:', error)
      throw new Error(`Failed to generate notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if the service is properly initialized and can communicate with the API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        credentials: 'include'
      })
      return response.ok
    } catch (error) {
      console.error('Notification service health check failed:', error)
      return false
    }
  }
}

export default ClientNotificationService