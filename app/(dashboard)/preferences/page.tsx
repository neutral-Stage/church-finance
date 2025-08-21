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
import { supabase } from '@/lib/supabase'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
    sound: boolean
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
    sound: true
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
  const { user, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)

  const loadPreferences = useCallback(async () => {
    if (!user) return

    try {
      // Check if we have a valid session from AuthContext
      if (!session) {
        return
      }

      // Explicitly set the session on the Supabase client
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })

      const { data } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (data && data.preferences) {
        setPreferences({ ...defaultPreferences, ...data.preferences })
      }
    } catch {
      // Silently handle error - user will see default preferences
    }
  }, [user, session])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const savePreferences = async () => {
    if (!user) return



    setLoading(true)
    try {
      // Check if we have a valid session from AuthContext
      if (!session) {
        throw new Error('Authentication session not found. Please sign in again.')
      }
      
      // Explicitly set the session on the Supabase client
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferences
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto p-6 space-y-6 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-lg" />
            <Settings className="relative h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Preferences</h1>
            <p className="text-white/70">Customize your experience and account settings</p>
          </div>
        </div>
        <Button
          onClick={savePreferences}
          disabled={loading}
          className="bg-white/10 backdrop-blur-xl border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center">
              <Sun className="h-5 w-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription className="text-white/70">
              Customize the look and feel of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/90">Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => updatePreference('theme', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="light" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="en" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="es" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Español
                    </div>
                  </SelectItem>
                  <SelectItem value="fr" className="text-white hover:bg-white/10">
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
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription className="text-white/70">
              Choose how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-white/70" />
                  <div>
                    <Label className="text-white/90">Email Notifications</Label>
                    <p className="text-xs text-white/60">Receive updates via email</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.email}
                  onCheckedChange={(checked) => updatePreference('notifications.email', checked)}
                  className="border-white/20 data-[state=checked]:bg-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-white/70" />
                  <div>
                    <Label className="text-white/90">Push Notifications</Label>
                    <p className="text-xs text-white/60">Mobile and browser notifications</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.push}
                  onCheckedChange={(checked) => updatePreference('notifications.push', checked)}
                  className="border-white/20 data-[state=checked]:bg-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-4 w-4 text-white/70" />
                  <div>
                    <Label className="text-white/90">Sound Notifications</Label>
                    <p className="text-xs text-white/60">Play sound for notifications</p>
                  </div>
                </div>
                <Checkbox
                  checked={preferences.notifications.sound}
                  onCheckedChange={(checked) => updatePreference('notifications.sound', checked)}
                  className="border-white/20 data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Privacy
            </CardTitle>
            <CardDescription className="text-white/70">
              Control your privacy and data visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/90">Profile Visibility</Label>
              <Select
                value={preferences.privacy.profileVisibility}
                onValueChange={(value) => updatePreference('privacy.profileVisibility', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="public" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="members" className="text-white hover:bg-white/10">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Members Only
                    </div>
                  </SelectItem>
                  <SelectItem value="private" className="text-white hover:bg-white/10">
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
                <Label className="text-white/90">Show Email Address</Label>
                <Checkbox
                  checked={preferences.privacy.showEmail}
                  onCheckedChange={(checked) => updatePreference('privacy.showEmail', checked)}
                  className="border-white/20 data-[state=checked]:bg-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-white/90">Show Phone Number</Label>
                <Checkbox
                  checked={preferences.privacy.showPhone}
                  onCheckedChange={(checked) => updatePreference('privacy.showPhone', checked)}
                  className="border-white/20 data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Settings */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Dashboard
            </CardTitle>
            <CardDescription className="text-white/70">
              Customize your dashboard experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/90">Default View</Label>
              <Select
                value={preferences.dashboard.defaultView}
                onValueChange={(value) => updatePreference('dashboard.defaultView', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="dashboard" className="text-white hover:bg-white/10">Dashboard</SelectItem>
                  <SelectItem value="transactions" className="text-white hover:bg-white/10">Transactions</SelectItem>
                  <SelectItem value="offerings" className="text-white hover:bg-white/10">Offerings</SelectItem>
                  <SelectItem value="reports" className="text-white hover:bg-white/10">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90">Items Per Page</Label>
              <Select
                value={preferences.dashboard.itemsPerPage.toString()}
                onValueChange={(value) => updatePreference('dashboard.itemsPerPage', parseInt(value))}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/20">
                  <SelectItem value="5" className="text-white hover:bg-white/10">5</SelectItem>
                  <SelectItem value="10" className="text-white hover:bg-white/10">10</SelectItem>
                  <SelectItem value="25" className="text-white hover:bg-white/10">25</SelectItem>
                  <SelectItem value="50" className="text-white hover:bg-white/10">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/90">Auto Refresh</Label>
                <p className="text-xs text-white/60">Automatically refresh data</p>
              </div>
              <Checkbox
                checked={preferences.dashboard.autoRefresh}
                onCheckedChange={(checked) => updatePreference('dashboard.autoRefresh', checked)}
                className="border-white/20 data-[state=checked]:bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}