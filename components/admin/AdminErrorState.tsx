'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GlassButton } from '@/components/ui/glass-button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AdminErrorStateProps {
  error: string
  onRetry?: () => void
  onClear?: () => void
  showRetry?: boolean
  className?: string
}

export function AdminErrorState({
  error,
  onRetry,
  onClear,
  showRetry = true,
  className = ''
}: AdminErrorStateProps) {
  const isAuthError = error.includes('sign in') || error.includes('permission')
  const isConnectionError = error.includes('connect') || error.includes('network')

  return (
    <Alert variant="destructive" className={`mb-6 ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <div>
            <p className="font-semibold">
              {isAuthError ? 'Access Error' : isConnectionError ? 'Connection Error' : 'Error'}
            </p>
            <p>{error}</p>
          </div>

          {/* Contextual help */}
          {isAuthError && (
            <div className="text-sm">
              <p className="font-medium">To resolve this issue:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>Ensure you have the correct role assigned</li>
                <li>Check that your account is active</li>
                <li>Contact your system administrator to review your permissions</li>
              </ul>
            </div>
          )}

          {isConnectionError && (
            <div className="text-sm">
              <p className="font-medium">Troubleshooting steps:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          )}

          {error.includes('sign in') && (
            <div className="mt-3 text-sm">
              <p>
                Please{' '}
                <a href="/auth/login" className="underline text-red-200 hover:text-red-100">
                  sign in
                </a>{' '}
                to continue.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {showRetry && onRetry && (
              <GlassButton variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </GlassButton>
            )}
            {onClear && (
              <GlassButton variant="ghost" size="sm" onClick={onClear}>
                Dismiss
              </GlassButton>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}