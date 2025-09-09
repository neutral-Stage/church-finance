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
  }, [user?.id])

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
        <Button variant="ghost" size="sm" className={`relative text-white/70 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 ${className}`}>
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1">
                <div className="absolute inset-0 bg-red-400/30 rounded-full blur-sm animate-pulse" />
                <Badge
                  variant="destructive"
                  className="relative h-5 w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-br from-red-500 to-red-600 font-semibold border border-red-400/30 backdrop-blur-sm"
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
        className="w-80 glass-card-dark border-white/10 p-0 max-h-96 backdrop-blur-xl shadow-2xl"
        sideOffset={8}
      >
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="relative mr-3">
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md" />
                <div className="relative bg-blue-400/10 p-2 rounded-full backdrop-blur-sm border border-blue-400/20">
                  <Bell className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <h3 className="text-white font-semibold">Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-white/70 hover:text-white hover:bg-white/10 h-6 px-2 hover:scale-105 transition-all duration-300"
                >
                  Mark all read
                </Button>
              )}
              <Badge variant="secondary" className="bg-transparent border border-white/20 text-white/80 backdrop-blur-sm">
                {unreadCount} new
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              <span className="ml-2 text-white/70 text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                <X className="relative h-12 w-12 text-red-400 mx-auto" />
              </div>
              <p className="text-red-400 font-medium">Error loading notifications</p>
              <p className="text-white/50 text-sm mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setError(null); loadNotifications(); }}
                className="mt-3 text-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                Try again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
                <Bell className="relative h-12 w-12 text-white/30 mx-auto" />
              </div>
              <p className="text-white/70 font-medium">No notifications</p>
              <p className="text-white/50 text-sm mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.category] || Bell
                const categoryColor = categoryColors[notification.category] || 'bg-gray-500'

                return (
                  <div
                    key={notification.id}
                    className={`group p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden ${!notification.read ? 'bg-blue-500/10 border-l-2 border-blue-400/50' : 'hover:scale-[1.01]'
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
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400" />
                    )}
                    <div className="flex items-start space-x-3">
                      <div className={`relative p-2 rounded-full ${categoryColor} flex-shrink-0 backdrop-blur-sm border border-white/20 transition-all duration-300`}>
                        <div className={`absolute inset-0 rounded-full blur-md ${categoryColor?.replace?.('bg-', 'bg-')?.replace?.('-500', '-400/20') || 'bg-gray-400/20'}`} />
                        <div className="relative">
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold transition-colors ${!notification.read ? 'text-white group-hover:text-white' : 'text-white/80 group-hover:text-white/90'}`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 transition-colors ${!notification.read ? 'text-white/80 group-hover:text-white/90' : 'text-white/60 group-hover:text-white/70'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-white/50 mt-2 font-medium">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            {!notification.read && (
                              <div className="flex items-center mt-2">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-sm animate-pulse" />
                                  <div className="relative w-2 h-2 bg-blue-400 rounded-full"></div>
                                </div>
                                <span className="ml-2 text-blue-400 text-xs font-medium">New</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 ml-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-white/50 hover:text-white hover:bg-white/10 hover:scale-110 transition-all duration-300"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="glass-card-dark border-white/20">
                                {!notification.read && (
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 flex items-center transition-colors"
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
                                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center transition-colors"
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
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20"
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