'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Check, ChevronDown, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ChurchWithRole } from '@/types/database'

interface ChurchSelectorProps {
  currentChurch?: ChurchWithRole
  onChurchChange?: (church: ChurchWithRole) => void
  onLoadingChange?: (loading: boolean) => void
}

export function ChurchSelector({ currentChurch, onChurchChange, onLoadingChange }: ChurchSelectorProps) {
  const [churches, setChurches] = useState<ChurchWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const fetchUserChurches = useCallback(async () => {
    setLoading(true)
    onLoadingChange?.(true)

    try {
      console.log('ChurchSelector: Fetching churches from API...')
      const response = await fetch('/api/churches')
      const data = await response.json()

      console.log('ChurchSelector: API response status:', response.status)
      console.log('ChurchSelector: API response data:', data)

      if (response.ok) {
        const userChurches = data.churches?.map((church: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          ...church,
          role: church.user_church_roles?.[0]?.roles,
          user_church_role: church.user_church_roles?.[0]
        })) || []

        console.log('ChurchSelector: Processed churches:', userChurches)
        setChurches(userChurches)
      } else {
        console.error('ChurchSelector: Failed to fetch churches:', data.error)

        // Handle unauthorized specifically - this is a valid state
        if (response.status === 401) {
          console.log('ChurchSelector: User not authenticated, setting empty churches list')
        }

        setChurches([])
      }
    } catch (error) {
      console.error('ChurchSelector: Error fetching user churches:', error)
      setChurches([])
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
      console.log('ChurchSelector: Loading completed')
    }
  }, [onLoadingChange]) // Remove currentChurch and onChurchChange dependencies to prevent infinite loops

  useEffect(() => {
    fetchUserChurches()
  }, [fetchUserChurches])

  // Separate effect to handle church selection when churches are loaded
  useEffect(() => {
    if (!currentChurch && churches.length > 0 && onChurchChange) {
      console.log('ChurchSelector: Auto-selecting first church:', churches[0])
      onChurchChange(churches[0])
    }
  }, [churches, currentChurch, onChurchChange])

  const handleChurchSelect = (church: ChurchWithRole) => {
    onChurchChange?.(church)
    setIsOpen(false)
    
    // Store selected church in localStorage for persistence
    localStorage.setItem('selectedChurch', JSON.stringify(church))
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-100 text-blue-800'
      case 'fellowship': return 'bg-green-100 text-green-800'
      case 'ministry': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'church_admin': return 'bg-orange-100 text-orange-800'
      case 'treasurer': return 'bg-blue-100 text-blue-800'
      case 'finance_viewer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-white/70 text-sm">Loading...</span>
      </div>
    )
  }

  if (churches.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800 rounded-md">
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="text-white/70 text-sm">No churches available</span>
      </div>
    )
  }

  if (churches.length === 1) {
    const church = churches[0]
    return (
      <div className="flex items-center space-x-3 px-3 py-2 bg-slate-800 rounded-md">
        <Building2 className="w-5 h-5 text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium truncate">{church.name}</div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge className={getTypeColor(church.type)}>{church.type}</Badge>
            <Badge className={getRoleColor(church.role?.name || '')}>{church.role?.display_name || 'No Role'}</Badge>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="justify-between bg-slate-800 border-slate-700 hover:bg-slate-700 text-white w-full max-w-xs"
        >
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span className="truncate">
              {currentChurch?.name || 'Select Church'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Church</DialogTitle>
          <DialogDescription>
            Choose which church/fellowship/ministry you want to manage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {churches.map((church) => (
            <Card 
              key={church.id} 
              className={`cursor-pointer transition-colors ${
                currentChurch?.id === church.id 
                  ? 'bg-blue-600/20 border-blue-500' 
                  : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
              }`}
              onClick={() => handleChurchSelect(church)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Building2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{church.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getTypeColor(church.type)}>
                          {church.type}
                        </Badge>
                        <Badge className={getRoleColor(church.role?.name || '')}>
                          {church.role?.display_name || 'No Role'}
                        </Badge>
                      </div>
                      {church.description && (
                        <p className="text-gray-400 text-sm mt-1 truncate">
                          {church.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {currentChurch?.id === church.id && (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>
                
                {/* Quick stats could go here */}
                <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>Access granted {church.user_church_role?.granted_at ? new Date(church.user_church_role.granted_at).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  {church.user_church_role?.expires_at && (
                    <div className="flex items-center space-x-1">
                      <span>Expires {new Date(church.user_church_role.expires_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}