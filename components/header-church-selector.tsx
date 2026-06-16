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
      case 'church': return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      case 'fellowship': return 'bg-income/15 text-income border-income/30'
      case 'ministry': return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-destructive/15 text-destructive border-destructive/30'
      case 'church_admin': return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
      case 'treasurer': return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      case 'finance_viewer': return 'bg-income/15 text-income border-income/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg ${className}`}>
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-destructive" />
        <span className="text-destructive text-sm">Failed to load churches</span>
      </div>
    )
  }

  if (availableChurches.length === 0) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg ${className}`}>
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">No churches available</span>
      </div>
    )
  }

  if (availableChurches.length === 1) {
    const church = availableChurches[0]
    return (
      <div className={`flex items-center space-x-3 px-3 py-2 bg-card border border-border rounded-lg ${className}`}>
        <Building2 className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-medium text-sm truncate">{church.name}</div>
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
          className={`justify-between h-auto py-2 ${className}`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-sm font-medium truncate">
                {selectedChurch?.name || 'Select Church'}
              </div>
              {selectedChurch && (
                <div className="text-xs text-muted-foreground truncate">
                  {selectedChurch.type} • {selectedChurch.role?.display_name || 'No Role'}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Select Church</span>
          </DialogTitle>
          <DialogDescription>
            Choose which church/fellowship/ministry you want to manage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {availableChurches.map((church) => (
            <Card
              key={church.id}
              className={`cursor-pointer transition-colors ${
                selectedChurch?.id === church.id
                  ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30'
                  : 'hover:bg-accent'
              }`}
              onClick={() => handleChurchSelect(church)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-medium truncate">{church.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(church.type)}`}>
                          {church.type}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getRoleColor(church.role?.name || '')}`}>
                          {church.role?.display_name || 'No Role'}
                        </Badge>
                      </div>
                      {church.description && (
                        <p className="text-muted-foreground text-sm mt-1 truncate">
                          {church.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedChurch?.id === church.id && (
                      <Check className="w-5 h-5 text-income" />
                    )}
                  </div>
                </div>

                {/* Additional info */}
                <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
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