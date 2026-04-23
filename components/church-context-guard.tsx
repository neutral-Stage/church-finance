'use client'

import React from 'react'
import { useChurch } from '@/contexts/ChurchContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HeaderChurchSelector } from '@/components/header-church-selector'
import { AlertTriangle, Building2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ChurchContextGuardProps {
  children: React.ReactNode
  requireChurch?: boolean
  showChurchSelector?: boolean
  fallbackMessage?: string
}

export function ChurchContextGuard({
  children,
  requireChurch = true,
  showChurchSelector = true,
  fallbackMessage = 'A church must be selected to view this content.'
}: ChurchContextGuardProps) {
  const { selectedChurch, availableChurches, isLoading, error } = useChurch()

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading church context...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>Failed to load church information: {error}</p>
            <p className="text-sm">Please try refreshing the page or contact support if the problem persists.</p>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Show no churches available state
  if (availableChurches.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>No Churches Available</span>
          </CardTitle>
          <CardDescription>
            You don&apos;t have access to any churches yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              To access the church finance system, you need to be granted access to at least one church.
            </p>
            <p className="text-sm text-gray-600">
              Please contact your church administrator to request access, or if you&apos;re an administrator,
              you may need to set up your church first.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show church selection required state
  if (requireChurch && !selectedChurch) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Church Selection Required</span>
          </CardTitle>
          <CardDescription>
            {fallbackMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You have access to {availableChurches.length} church{availableChurches.length !== 1 ? 'es' : ''}.
              Please select a church to continue.
            </p>
            {showChurchSelector && (
              <div className="flex justify-center">
                <HeaderChurchSelector />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // All checks passed, render children
  return <>{children}</>
}

// Hook for components that need church context validation
export function useChurchGuard(requireChurch = true) {
  const { selectedChurch, availableChurches, isLoading, error } = useChurch()

  const isReady = !isLoading && !error && availableChurches.length > 0
  const hasChurch = !!selectedChurch
  const canProceed = isReady && (!requireChurch || hasChurch)

  return {
    isReady,
    hasChurch,
    canProceed,
    selectedChurch,
    availableChurches,
    isLoading,
    error,
    // Helper to get user-friendly status message
    getStatusMessage: () => {
      if (isLoading) return 'Loading church information...'
      if (error) return `Error loading churches: ${error}`
      if (availableChurches.length === 0) return 'No churches available'
      if (requireChurch && !selectedChurch) return 'Please select a church'
      return 'Ready'
    }
  }
}