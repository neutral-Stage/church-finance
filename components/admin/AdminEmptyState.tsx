'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  className = '',
}: AdminEmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="py-12 text-center">
          {Icon && <Icon className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />}
          <h3 className="mb-2 text-xl font-medium text-foreground">{title}</h3>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">{description}</p>

          {!isFiltered && actionLabel && onAction && (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}

          {isFiltered && (
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
