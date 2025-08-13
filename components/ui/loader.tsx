'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// TypeScript interfaces
interface LoaderProps {
  message?: string
  className?: string
}

// FullScreenLoaderProps is the same as LoaderProps for now
type FullScreenLoaderProps = LoaderProps

interface InlineLoaderProps extends LoaderProps {
  size?: 'sm' | 'md' | 'lg'
}

// Animated background orbs component
const AnimatedOrbs = () => (
  <>
    {/* Floating orbs with blur effects and pulse animations */}
    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
    <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-lg animate-pulse delay-1000" />
    <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-white/8 rounded-full blur-md animate-pulse delay-500" />
    <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-white/6 rounded-full blur-xl animate-pulse delay-700" />
  </>
)

// Dual-ring spinner component
const DualRingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className={cn('relative', sizeClasses[size])}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      {/* Inner ring */}
      <div className="absolute inset-2 rounded-full border-2 border-white/10 border-b-white/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
    </div>
  )
}

// Full-screen loader component
export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ 
  message = 'Loading...', 
  className 
}) => {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95',
      'backdrop-blur-sm',
      className
    )}>
      {/* Animated background orbs */}
      <AnimatedOrbs />
      
      {/* Main loader content */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Glass-morphism container */}
        <div className="relative p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          {/* Dual-ring spinner */}
          <div className="flex justify-center mb-4">
            <DualRingSpinner size="lg" />
          </div>
          
          {/* Loading message */}
          <p className="text-white/90 text-lg font-medium text-center min-w-[200px]">
            {message}
          </p>
        </div>
        
        {/* Subtle loading dots */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    </div>
  )
}

// Inline loader component
export const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className 
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center p-8',
      className
    )}>
      <div className="flex items-center space-x-3">
        {/* Dual-ring spinner */}
        <DualRingSpinner size={size} />
        
        {/* Loading message */}
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          {message}
        </span>
      </div>
    </div>
  )
}

// Default export for convenience
export default FullScreenLoader