'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  message?: string
  className?: string
}

type FullScreenLoaderProps = LoaderProps

interface InlineLoaderProps extends LoaderProps {
  size?: 'sm' | 'md' | 'lg'
}

const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-12 w-12 border-[3px]',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-muted border-t-primary',
        sizeClasses[size]
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <Spinner size="lg" />
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  )
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  message = 'Loading...',
  size = 'md',
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex items-center gap-3">
        <Spinner size={size} />
        <span className="text-muted-foreground font-medium">{message}</span>
      </div>
    </div>
  )
}

export default FullScreenLoader
