'use client'

import React from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { LucideIcon } from 'lucide-react'

interface AdminPageHeaderProps {
  title: string
  description: string
  actions?: {
    label: string
    icon?: LucideIcon
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline'
    onClick: () => void
  }[]
}

export function AdminPageHeader({ title, description, actions = [] }: AdminPageHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-white/70 mt-2">{description}</p>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <GlassButton
              key={index}
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </GlassButton>
          ))}
        </div>
      )}
    </div>
  )
}