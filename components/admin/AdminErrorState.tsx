'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  className = '',
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

          {isAuthError && (
            <div className="text-sm">
              <p className="font-medium">To resolve this issue:</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
                <li>Ensure you have the correct role assigned</li>
                <li>Check that your account is active</li>
                <li>Contact your system administrator to review your permissions</li>
              </ul>
            </div>
          )}

          {isConnectionError && (
            <div className="text-sm">
              <p className="font-medium">Troubleshooting steps:</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
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
                <a href="/auth/login" className="font-medium underline hover:opacity-80">
                  sign in
                </a>{' '}
                to continue.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {showRetry && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            {onClear && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
