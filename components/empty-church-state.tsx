'use client'

import React from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

interface EmptyChurchStateProps {
  className?: string
}

export function EmptyChurchState({
  className = ''
}: EmptyChurchStateProps) {
  return (
    <GlassCard variant="default" className={className}>
      <GlassCardContent>
        <div className="text-center py-16">
          <Building2 className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-white mb-4">No Church Selected</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Please select a church from the church selector to view and manage financial data.
            If you don&apos;t see any churches available, contact your administrator.
          </p>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Looking for the church selector? Check the navigation bar at the top of the page.
            </p>

            <Link href="/dashboard">
              <GlassButton variant="primary">
                Go to Dashboard
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}