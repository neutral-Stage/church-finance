'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
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

const categoryStyles: Record<string, { icon: string; badge: string }> = {
  transaction: { icon: 'bg-income/15 text-income', badge: 'bg-income/15 text-income border-income/30' },
  member: { icon: 'bg-primary/15 text-primary', badge: 'bg-primary/15 text-primary border-primary/30' },
  offering: { icon: 'bg-purple-500/15 text-purple-700 dark:text-purple-300', badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  bill: { icon: 'bg-destructive/15 text-destructive', badge: 'bg-destructive/15 text-destructive border-destructive/30' },
  system: { icon: 'bg-muted text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' },
  report: { icon: 'bg-pending/15 text-pending', badge: 'bg-pending/15 text-pending border-pending/30' },
  advance: { icon: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' }
}

const defaultCategoryStyle = { icon: 'bg-muted text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' }

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
        setNotifications(data as NotificationData[])
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

  const callNotificationsApi = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Request failed (${res.status})`)
    }
    return res.json()
  }

  const generateNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      await callNotificationsApi({ action: 'generateAll' })
      await loadNotifications()
    } catch (error) {
      console.error('generateNotifications failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await callNotificationsApi({ action: 'markAsRead', notificationId })
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
    } catch (error) {
      console.error('markAsRead failed:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await callNotificationsApi({ action: 'markAllAsRead' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('markAllAsRead failed:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await callNotificationsApi({ action: 'delete', notificationId })
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('deleteNotification failed:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-3 rounded-full border border-primary/20">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={generateNotifications}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bill">Bills</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="offering">Offerings</SelectItem>
              <SelectItem value="advance">Advances</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg">No notifications found</p>
            <p className="text-muted-foreground text-sm mt-2">
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.category] || Bell
              const categoryStyle = categoryStyles[notification.category] || defaultCategoryStyle

              return (
                <div
                  key={notification.id}
                  className={`group p-6 hover:bg-accent transition-all duration-300 cursor-pointer relative ${!notification.read ? 'bg-primary/5 border-l-4 border-primary/50' : ''
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
                    <div className={`p-3 rounded-full ${categoryStyle.icon} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-3 space-x-4">
                            <p className="text-xs text-muted-foreground font-medium">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`${categoryStyle.badge} border`}
                            >
                              {notification.category}
                            </Badge>
                            {!notification.read && (
                              <Badge className="bg-primary/15 text-primary border border-primary/30">
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
                              aria-label="Mark as read"
                              className="text-muted-foreground hover:text-foreground hover:bg-accent"
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
                            aria-label="Delete notification"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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