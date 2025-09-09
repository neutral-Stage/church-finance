// Simple test script to verify the notification client service
// This can be used for debugging or testing the notification system

import { ClientNotificationService } from './client'

export const testNotificationSystem = async (): Promise<void> => {
  try {
    console.log('Testing notification system...')
    
    // Health check
    const isHealthy = await ClientNotificationService.healthCheck()
    console.log('Health check:', isHealthy ? 'PASS' : 'FAIL')
    
    if (!isHealthy) {
      console.error('API endpoints are not responding correctly')
      return
    }
    
    // Try to get notifications
    const notifications = await ClientNotificationService.getUserNotifications({ limit: 5 })
    console.log(`Fetched ${notifications.length} notifications`)
    console.log('First notification:', notifications[0] || 'No notifications')
    
    // Try to generate notifications (if user is authenticated)
    try {
      await ClientNotificationService.generateNotifications()
      console.log('Notification generation: SUCCESS')
    } catch (error) {
      console.log('Notification generation: FAILED (may require authentication)')
    }
    
    console.log('Notification system test completed successfully')
  } catch (error) {
    console.error('Notification system test failed:', error)
  }
}

// Usage example (don't auto-run):
// testNotificationSystem().catch(console.error)