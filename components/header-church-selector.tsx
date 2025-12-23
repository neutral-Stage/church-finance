'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Check, ChevronDown, Users, Loader2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useChurch } from '@/contexts/ChurchContext'
import { ChurchWithRole } from '@/types/database'

interface HeaderChurchSelectorProps {
  className?: string
}

export function HeaderChurchSelector({ className }: HeaderChurchSelectorProps) {
  const { selectedChurch, availableChurches, setSelectedChurch, isLoading, error } = useChurch()
  const [isOpen, setIsOpen] = useState(false)

  const handleChurchSelect = async (church: ChurchWithRole) => {
    await setSelectedChurch(church)
    setIsOpen(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'church': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'fellowship': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'ministry': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'church_admin': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'treasurer': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'finance_viewer': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg ${className}`}>
        <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
        <span className="text-white/70 text-sm">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-sm">Failed to load churches</span>
      </div>
    )
  }

  if (availableChurches.length === 0) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg ${className}`}>
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="text-white/70 text-sm">No churches available</span>
      </div>
    )
  }

  if (availableChurches.length === 1) {
    const church = availableChurches[0]
    return (
      <div className={`flex items-center space-x-3 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg ${className}`}>
        <Building2 className="w-4 h-4 text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{church.name}</div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className={`text-xs ${getTypeColor(church.type)}`}>
              {church.type}
            </Badge>
            <Badge variant="outline" className={`text-xs ${getRoleColor(church.role?.name || '')}`}>
              {church.role?.display_name || 'No Role'}
            </Badge>
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
          className={`justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white backdrop-blur-sm transition-colors h-auto py-2 ${className}`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-sm font-medium truncate">
                {selectedChurch?.name || 'Select Church'}
              </div>
              {selectedChurch && (
                <div className="text-xs text-white/60 truncate">
                  {selectedChurch.type} • {selectedChurch.role?.display_name || 'No Role'}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Select Church</span>
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Choose which church/fellowship/ministry you want to manage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {availableChurches.map((church) => (
            <Card
              key={church.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedChurch?.id === church.id
                  ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              onClick={() => handleChurchSelect(church)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <Building2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{church.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(church.type)}`}>
                          {church.type}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getRoleColor(church.role?.name || '')}`}>
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
                    {selectedChurch?.id === church.id && (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </div>

                {/* Additional info */}
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