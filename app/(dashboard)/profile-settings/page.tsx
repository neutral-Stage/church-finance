// User profile management - client-side only due to user interaction requirements
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Save,
  Camera,
  Edit3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    bio: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        bio: user.bio || ''
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)

    try {
      // Update auth metadata - client will use existing session cookies
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio
        }
      })

      if (authError) {
        throw authError
      }

      // Update users table - client will use existing session cookies
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (dbError) {
        throw dbError
      }

      // Refresh user data in context
      await refreshUser()
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and account details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview Card */}
        <Card className="animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-border">
                  <AvatarFallback className="bg-muted text-foreground font-bold text-2xl">
                    {user.full_name?.split(' ').map((n: string) => n[0]).join('') || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  aria-label="Change profile photo"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardTitle className="text-foreground">{user.full_name || 'User'}</CardTitle>
            <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
            <div className="flex justify-center mt-2">
              <Badge variant="secondary" className="capitalize">
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 hover:bg-accent transition-all duration-300">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Member since {new Date(user.created_at || '').toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                <span>Email verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="lg:col-span-2 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Edit3 className="h-5 w-5 mr-2" />
              Edit Profile Information
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="pl-10 cursor-not-allowed"
                      placeholder="Email cannot be changed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email address cannot be modified</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground">
                    Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="resize-none"
                  placeholder="Tell us a little about yourself..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (user) {
                      setFormData({
                        full_name: user.full_name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        address: user.address || '',
                        bio: user.bio || ''
                      })
                    }
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}