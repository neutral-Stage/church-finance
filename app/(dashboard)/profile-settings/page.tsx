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
  const { user } = useAuth()
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
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio
        }
      })

      if (error) throw error

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg" />
          <User className="relative h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-white/70">Manage your personal information and account details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarFallback className="bg-white/10 text-white font-bold text-2xl">
                    {user.full_name?.split(' ').map(n => n[0]).join('') || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white/10 backdrop-blur-xl border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardTitle className="text-white/90">{user.full_name || 'User'}</CardTitle>
            <CardDescription className="text-white/70">{user.email}</CardDescription>
            <div className="flex justify-center mt-2">
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20 capitalize">
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg space-y-2 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center text-sm text-white/80">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Member since {new Date(user.created_at || '').toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-sm text-white/80">
                <Mail className="h-4 w-4 mr-2" />
                <span>Email verified</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="lg:col-span-2 bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-white/90 flex items-center">
              <Edit3 className="h-5 w-5 mr-2" />
              Edit Profile Information
            </CardTitle>
            <CardDescription className="text-white/70">
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-white/90">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="pl-10 bg-white/5 border-white/20 text-white/60 cursor-not-allowed"
                      placeholder="Email cannot be changed"
                    />
                  </div>
                  <p className="text-xs text-white/50">Email address cannot be modified</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/90">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-white/90">
                    Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white/90">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 resize-none"
                  placeholder="Tell us a little about yourself..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/5 backdrop-blur-xl border-white/20 text-white/90 hover:bg-white/15 hover:text-white transition-all duration-300"
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
                  className="bg-white/10 backdrop-blur-xl border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-all duration-300"
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
  )
}