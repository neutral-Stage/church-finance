'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface AdminLoadingStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function AdminLoadingState({
  title,
  description,
  icon: Icon,
  className = ''
}: AdminLoadingStateProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {description && <p className="text-white/70 mt-2">{description}</p>}
        </div>
      </div>

      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400/30 border-t-purple-400"></div>
            {Icon && (
              <Icon className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
            )}
          </div>
          <div className="text-center">
            <span className="text-white font-medium">Loading...</span>
            {description && (
              <p className="text-white/60 text-sm mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}