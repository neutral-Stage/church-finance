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

// Animated background orbs component - more subtle
const AnimatedOrbs = () => (
  <>
    {/* Floating orbs with subtle blur effects and gentle pulse animations */}
    <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse" />
    <div className="absolute top-3/4 right-1/4 w-20 h-20 bg-white/3 rounded-full blur-xl animate-pulse delay-1000" />
    <div className="absolute bottom-1/4 left-1/3 w-16 h-16 bg-white/4 rounded-full blur-lg animate-pulse delay-500" />
    <div className="absolute top-1/2 right-1/3 w-22 h-22 bg-white/3 rounded-full blur-2xl animate-pulse delay-700" />
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
      className
    )}>
      {/* Animated background orbs */}
      <AnimatedOrbs />
      
      {/* Main loader content */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Enhanced glass-morphism container */}
        <div className="relative p-10 rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] shadow-2xl">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.05] to-transparent" />
          
          {/* Content container */}
          <div className="relative z-10">
            {/* Dual-ring spinner */}
            <div className="flex justify-center mb-6">
              <DualRingSpinner size="lg" />
            </div>
            
            {/* Loading message */}
            <p className="text-white text-lg font-medium text-center min-w-[200px]">
              {message}
            </p>
          </div>
        </div>
        
        {/* Subtle loading dots */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-slate-400/60 dark:bg-white/60 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-slate-400/60 dark:bg-white/60 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-slate-400/60 dark:bg-white/60 rounded-full animate-bounce delay-200" />
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