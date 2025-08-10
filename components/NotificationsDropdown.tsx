'use client'

import { useState, useEffect } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Settings,
  X,
  MoreHorizontal
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'transaction' | 'member' | 'offering' | 'bill' | 'system' | 'report'
  read: boolean
  created_at: string
  action_url?: string
}

interface NotificationsDropdownProps {
  className?: string
}

const notificationIcons = {
  transaction: DollarSign,
  member: Users,
  offering: TrendingUp,
  bill: Calendar,
  system: Settings,
  report: FileText
}

const notificationColors = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400'
}

const categoryColors = {
  transaction: 'bg-green-500',
  member: 'bg-blue-500',
  offering: 'bg-purple-500',
  bill: 'bg-red-500',
  system: 'bg-gray-500',
  report: 'bg-orange-500'
}

export default function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        await loadNotifications()
        // Set up real-time subscription for new notifications
        const subscription = supabase
          .channel('notifications')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, () => {
            loadNotifications()
          })
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      }
    }
    fetchNotifications()
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Try to load from database first
      const { data: dbNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (dbNotifications && dbNotifications.length > 0) {
        setNotifications(dbNotifications)
        setUnreadCount(dbNotifications.filter(n => !n.read).length)
      } else {
        // Generate sample notifications if none exist
        const sampleNotifications = await generateSampleNotifications()
        setNotifications(sampleNotifications)
        setUnreadCount(sampleNotifications.filter(n => !n.read).length)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      // Fallback to sample notifications
      const sampleNotifications = await generateSampleNotifications()
      setNotifications(sampleNotifications)
      setUnreadCount(sampleNotifications.filter(n => !n.read).length)
    } finally {
      setLoading(false)
    }
  }

  const generateSampleNotifications = async (): Promise<Notification[]> => {
    const now = new Date()
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        title: 'New Offering Received',
        message: 'Sunday offering of $2,450 has been recorded',
        type: 'success',
        category: 'offering',
        read: false,
        created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        action_url: '/offerings'
      },
      {
        id: '2',
        title: 'Bill Due Soon',
        message: 'Electricity bill ($340) is due in 3 days',
        type: 'warning',
        category: 'bill',
        read: false,
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        action_url: '/bills'
      },
      {
        id: '3',
        title: 'New Member Added',
        message: 'John Smith has been added to the member directory',
        type: 'info',
        category: 'member',
        read: true,
        created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        action_url: '/members'
      },
      {
        id: '4',
        title: 'Monthly Report Ready',
        message: 'Financial report for December is now available',
        type: 'info',
        category: 'report',
        read: true,
        created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        action_url: '/reports'
      },
      {
        id: '5',
        title: 'Large Transaction Alert',
        message: 'Transaction of $5,000 requires approval',
        type: 'warning',
        category: 'transaction',
        read: false,
        created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        action_url: '/transactions'
      }
    ]

    return sampleNotifications
  }

  const markAsRead = async (notificationId: string) => {
    try {
      // Update in database if it exists
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Still update local state even if database update fails
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      // Still update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      // Still update local state
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
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
                const Icon = notificationIcons[notification.category]
                const colorClass = notificationColors[notification.type]
                const categoryColor = categoryColors[notification.category]
                
                return (
                  <div
                    key={notification.id}
                    className={`group p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                      !notification.read ? 'bg-blue-500/10 border-l-2 border-blue-400/50' : 'hover:scale-[1.01]'
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      // Handle navigation if needed
                    }}
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400" />
                    )}
                    <div className="flex items-start space-x-3">
                      <div className={`relative p-2 rounded-full ${categoryColor} flex-shrink-0 backdrop-blur-sm border border-white/20 transition-all duration-300`}>
                        <div className={`absolute inset-0 rounded-full blur-md ${categoryColor.replace('bg-', 'bg-').replace('-500', '-400/20')}`} />
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