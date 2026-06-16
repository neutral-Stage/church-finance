// User preferences management - client-side only due to user interaction requirements
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Mail,
  Smartphone,
  Save,
  Volume2,
  Eye,
  Lock,
  Database
} from 'lucide-react'
import {
  DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES,
  type NotificationCategoryPreferences,
} from '@/lib/notifications/preferences'
import { supabase } from '@/lib/supabase'
import { Json } from '@/types/database'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
    sound: boolean
    categories: NotificationCategoryPreferences
  }
  privacy: {
    profileVisibility: 'public' | 'members' | 'private'
    showEmail: boolean
    showPhone: boolean
  }
  dashboard: {
    defaultView: string
    itemsPerPage: number
    autoRefresh: boolean
  }
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  language: 'en',
  timezone: 'UTC',
  notifications: {
    email: true,
    push: true,
    desktop: false,
    sound: true,
    categories: { ...DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES },
  },
  privacy: {
    profileVisibility: 'members',
    showEmail: false,
    showPhone: false
  },
  dashboard: {
    defaultView: 'dashboard',
    itemsPerPage: 10,
    autoRefresh: true
  }
}

export default function Preferences() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)

  const loadPreferences = useCallback(async () => {
    if (!user) return

    try {
      if (!user) {
        return
      }

      const { data } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (data && data.preferences) {
        const stored = data.preferences as unknown as Partial<UserPreferences>
        setPreferences({
          ...defaultPreferences,
          ...stored,
          notifications: {
            ...defaultPreferences.notifications,
            ...(stored.notifications ?? {}),
            categories: {
              ...DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES,
              ...(stored.notifications?.categories ?? {}),
            },
          },
        })
      }
    } catch {
      // Silently handle error - user will see default preferences
    }
  }, [user])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const savePreferences = async () => {
    if (!user) return



    setLoading(true)
    try {
      if (!user) {
        throw new Error('User not found. Please sign in again.')
      }

      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        toast.success('Demo mode: preferences are not saved to a database.')
        return
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferences as unknown as Json
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        throw error
      }

      toast.success('Preferences saved successfully!')
    } catch {
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (path: string, value: unknown) => {
    setPreferences(prev => {
      const newPrefs = { ...prev }
      const keys = path.split('.')
      let current: Record<string, unknown> = newPrefs as Record<string, unknown>
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>
      }
      
      current[keys[keys.length - 1]] = value
      return newPrefs
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Preferences</h1>
            <p className="text-muted-foreground">Customize your experience and account settings</p>
          </div>
        </div>
        <Button
          onClick={savePreferences}
          disabled={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Sun className="h-5 w-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the look and feel of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => updatePreference('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center">
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="es">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Español
                    </div>
                  </SelectItem>
                  <SelectItem value="fr">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Français
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Master switch for email delivery</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.email}
                  onCheckedChange={(checked) => updatePreference('notifications.email', checked)}
                />

              </div>

              {preferences.notifications.email && (
                <div className="ml-4 pl-4 border-l border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email by category
                  </p>
                  {(
                    Object.entries(preferences.notifications.categories) as [
                      keyof NotificationCategoryPreferences,
                      boolean,
                    ][]
                  ).map(([category, enabled]) => (
                    <div key={category} className="flex items-center justify-between">
                      <Label className="capitalize font-normal">{category}</Label>
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          updatePreference(`notifications.categories.${category}`, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Mobile and browser notifications</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.push}
                  onCheckedChange={(checked) => updatePreference('notifications.push', checked)}
                />

              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Sound Notifications</Label>
                    <p className="text-xs text-muted-foreground">Play sound for notifications</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.sound}
                  onCheckedChange={(checked) => updatePreference('notifications.sound', checked)}
                />

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Privacy
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Control your privacy and data visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Visibility</Label>
              <Select
                value={preferences.privacy.profileVisibility}
                onValueChange={(value) => updatePreference('privacy.profileVisibility', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="members">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Members Only
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Email Address</Label>
                <Checkbox
                  checked={preferences.privacy.showEmail}
                  onCheckedChange={(checked) => updatePreference('privacy.showEmail', checked)}
                />

              </div>

              <div className="flex items-center justify-between">
                <Label>Show Phone Number</Label>
                <Checkbox
                  checked={preferences.privacy.showPhone}
                  onCheckedChange={(checked) => updatePreference('privacy.showPhone', checked)}
                />

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Settings */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Dashboard
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize your dashboard experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select
                value={preferences.dashboard.defaultView}
                onValueChange={(value) => updatePreference('dashboard.defaultView', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="offerings">Offerings</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Items Per Page</Label>
              <Select
                value={preferences.dashboard.itemsPerPage.toString()}
                onValueChange={(value) => updatePreference('dashboard.itemsPerPage', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Refresh</Label>
                <p className="text-xs text-muted-foreground">Automatically refresh data</p>
              </div>
              <Checkbox
                checked={preferences.dashboard.autoRefresh}
                onCheckedChange={(checked) => updatePreference('dashboard.autoRefresh', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}