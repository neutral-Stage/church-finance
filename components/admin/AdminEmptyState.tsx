'use client'

import React from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { LucideIcon } from 'lucide-react'

interface AdminEmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
  isFiltered?: boolean
  className?: string
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  isFiltered = false,
  className = ''
}: AdminEmptyStateProps) {
  return (
    <GlassCard variant="default" className={className}>
      <GlassCardContent>
        <div className="text-center py-12">
          {Icon && <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />}
          <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>

          {!isFiltered && actionLabel && onAction && (
            <GlassButton variant="primary" onClick={onAction}>
              {actionLabel}
            </GlassButton>
          )}

          {isFiltered && (
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your search terms or filters
            </p>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}