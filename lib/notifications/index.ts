// Notification service exports
// This file provides clean imports for the notification system

export { ServerNotificationService } from './server'
export { ClientNotificationService } from './client'
export type * from '@/types/notifications'

// Re-export for easier usage
export { ServerNotificationService as NotificationServerService } from './server'
export { ClientNotificationService as NotificationClientService } from './client'