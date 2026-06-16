'use client'

import { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIChatButtonProps {
  onClick: () => void
  isOpen: boolean
}

export function AIChatButton({ onClick, isOpen }: AIChatButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Tooltip */}
      {hovered && !isOpen && (
        <div className="bg-popover border border-border text-popover-foreground text-xs rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Ask ChurchAI anything</span>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open AI Chat Assistant"
        title="Open AI Chat Assistant"
        className={cn(
          'relative w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center',
          'transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isOpen
            ? 'bg-muted border border-border'
            : 'bg-primary hover:bg-primary/90'
        )}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping opacity-75" />
        )}
        <Bot className={cn('w-6 h-6', isOpen ? 'text-muted-foreground' : 'text-primary-foreground')} />
      </button>
    </div>
  )
}
