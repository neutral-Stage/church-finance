'use client'

import { useState, useEffect, useCallback } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  FileText,
  Settings,
  X,
  MoreHorizontal
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ClientNotificationService } from '@/lib/notifications/client'
import { Notification } from '@/types/notifications'
import { formatDistanceToNow } from 'date-fns'

interface NotificationsDropdownProps {
  className?: string
}

const notificationIcons = {
  transaction: DollarSign,
  member: Users,
  offering: TrendingUp,
  bill: Calendar,
  system: Settings,
  report: FileText,
  general: Bell
}

const categoryColors = {
  transaction: 'bg-green-500',
  member: 'bg-blue-500',
  offering: 'bg-purple-500',
  bill: 'bg-red-500',
  system: 'bg-gray-500',
  report: 'bg-orange-500',
  general: 'bg-gray-500'
}

export default function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      // Load notifications via the client service
      const fetchedNotifications = await ClientNotificationService.getUserNotifications({ limit: 20 })
      setNotifications(fetchedNotifications)
      setUnreadCount(ClientNotificationService.getUnreadCount(fetchedNotifications))
    } catch (err) {
      console.error('Error loading notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const initializeNotifications = async () => {
      if (user?.id) {
        // Load initial notifications
        await loadNotifications()
        
        // Set up real-time subscription for new notifications
        try {
          unsubscribe = ClientNotificationService.subscribeToNotifications(
            user.id,
            (updatedNotifications) => {
              setNotifications(updatedNotifications)
              setUnreadCount(ClientNotificationService.getUnreadCount(updatedNotifications))
            }
          )
        } catch (err) {
          console.error('Error setting up notification subscription:', err)
        }
      }
    }

    initializeNotifications()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.id, loadNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update - update UI immediately
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Make API call
      await ClientNotificationService.markAsRead(notificationId)
    } catch (err) {
      console.error('Error marking notification as read:', err)
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: false } : n
        )
      )
      setUnreadCount(prev => prev + 1)
      setError(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    
    // Store original state for rollback
    const originalNotifications = [...notifications]
    const originalCount = unreadCount
    
    try {
      // Optimistic update - update UI immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      
      // Make API call
      await ClientNotificationService.markAllAsRead()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      // Revert optimistic update on error
      setNotifications(originalNotifications)
      setUnreadCount(originalCount)
      setError(err instanceof Error ? err.message : 'Failed to mark all as read')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    // Store original state for rollback
    const notification = notifications.find(n => n.id === notificationId)
    const originalNotifications = [...notifications]
    const originalCount = unreadCount
    
    try {
      // Optimistic update - update UI immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      // Make API call
      await ClientNotificationService.deleteNotification(notificationId)
    } catch (err) {
      console.error('Error deleting notification:', err)
      // Revert optimistic update on error
      setNotifications(originalNotifications)
      setUnreadCount(originalCount)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className}`}>
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1">
                <Badge
                  variant="destructive"
                  className="relative h-5 w-5 p-0 flex items-center justify-center text-xs font-semibold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </div>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 max-h-96"
        sideOffset={8}
      >
        <div className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 bg-primary/10 p-2 rounded-full border border-primary/20">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-foreground font-semibold">Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-6 px-2"
                >
                  Mark all read
                </Button>
              )}
              <Badge variant="outline">
                {unreadCount} new
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary"></div>
              <span className="ml-2 text-muted-foreground text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <X className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Error loading notifications</p>
              <p className="text-muted-foreground text-sm mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setError(null); loadNotifications(); }}
                className="mt-3 text-xs"
              >
                Try again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-foreground font-medium">No notifications</p>
              <p className="text-muted-foreground text-sm mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.category] || Bell
                const categoryColor = categoryColors[notification.category] || 'bg-gray-500'

                return (
                  <div
                    key={notification.id}
                    className={`group p-4 hover:bg-accent transition-colors cursor-pointer relative ${!notification.read ? 'bg-primary/5 border-l-2 border-primary/50' : ''
                      }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      // Handle navigation to action URL
                      if (notification.action_url) {
                        window.location.href = notification.action_url
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${categoryColor} flex-shrink-0`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold ${!notification.read ? 'text-foreground' : 'text-foreground/80'}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm mt-1 text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            {!notification.read && (
                              <div className="flex items-center mt-2">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                <span className="ml-2 text-primary text-xs font-medium">New</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 ml-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {!notification.read && (
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center transition-colors rounded-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsRead(notification.id)
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center transition-colors rounded-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notification.id)
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-sm font-medium"
              onClick={() => window.location.href = '/notifications'}
            >
              <div className="flex items-center justify-center">
                <Bell className="h-4 w-4 mr-2" />
                View all notifications
              </div>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}