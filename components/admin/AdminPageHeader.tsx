'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  description: string
  actions?: {
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'
    onClick: () => void
  }[]
}

export function AdminPageHeader({ title, description, actions = [] }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button key={index} variant={action.variant || 'default'} onClick={action.onClick}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
