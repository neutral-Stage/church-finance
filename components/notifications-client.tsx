'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import NotificationService from '@/lib/notificationService'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  DollarSign,
  Users,
  Calendar,
  Settings,
  FileText,
  TrendingUp,
  CheckCircle,
  X,
  Search,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NotificationData } from '@/lib/server-data'

const notificationIcons = {
  transaction: DollarSign,
  member: Users,
  offering: TrendingUp,
  bill: Calendar,
  system: Settings,
  report: FileText,
  advance: DollarSign
}

const categoryColors = {
  transaction: 'bg-green-500',
  member: 'bg-blue-500',
  offering: 'bg-purple-500',
  bill: 'bg-red-500',
  system: 'bg-gray-500',
  report: 'bg-orange-500',
  advance: 'bg-indigo-500'
}

interface NotificationsClientProps {
  initialData: NotificationData[]
}

export default function NotificationsClient({ initialData }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>(initialData)
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationData[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { user } = useAuth()

  const loadNotifications = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        setNotifications(data)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      // Set up real-time subscription
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
  }, [user, loadNotifications])

  useEffect(() => {
    // Filter notifications based on search and filters
    let filtered = notifications

    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(n => n.category === filterCategory)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(n =>
        filterStatus === 'read' ? n.read : !n.read
      )
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchTerm, filterCategory, filterStatus])

  const generateNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      await NotificationService.generateAllNotifications()
      await loadNotifications()
    } catch {
      // Silently handle error
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
    } catch {
      // Silently handle error
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await NotificationService.markAllAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // Silently handle error
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch {
      // Silently handle error
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md" />
            <div className="relative bg-blue-400/10 p-3 rounded-full backdrop-blur-sm border border-blue-400/20">
              <Bell className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-white/70">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={generateNotifications}
            disabled={loading}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/30"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-400/30"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card-dark p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="glass-card-dark border-white/20">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bill">Bills</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="offering">Offerings</SelectItem>
              <SelectItem value="advance">Advances</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass-card-dark border-white/20">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-card-dark">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            <span className="ml-3 text-white/70">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
              <Bell className="relative h-16 w-16 text-white/30 mx-auto" />
            </div>
            <p className="text-white/70 font-medium text-lg">No notifications found</p>
            <p className="text-white/50 text-sm mt-2">
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.category] || Bell
              const categoryColor = categoryColors[notification.category] || 'bg-gray-500'

              return (
                <div
                  key={notification.id}
                  className={`group p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer relative ${!notification.read ? 'bg-blue-500/5 border-l-4 border-blue-400/50' : ''
                    }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                    if (notification.action_url) {
                      window.location.href = notification.action_url
                    }
                  }}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`relative p-3 rounded-full ${categoryColor} flex-shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${!notification.read ? 'text-white' : 'text-white/80'
                            }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-white/80' : 'text-white/60'
                            }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-3 space-x-4">
                            <p className="text-xs text-white/50 font-medium">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`${categoryColor?.replace?.('bg-', 'bg-')?.replace?.('-500', '-500/20') || 'bg-gray-500/20'} text-white border-0`}
                            >
                              {notification.category}
                            </Badge>
                            {!notification.read && (
                              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-400/30">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="text-white/50 hover:text-white hover:bg-white/10"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
    </div>
  )
}