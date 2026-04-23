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
        <div className="bg-slate-900 border border-white/10 text-white text-xs rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Ask ChurchAI anything</span>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Open AI Chat Assistant"
        className={cn(
          'relative w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center',
          'transition-all duration-300 ease-out',
          isOpen
            ? 'bg-white/10 border border-white/20 scale-95'
            : 'bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 hover:scale-110 hover:shadow-purple-500/30 hover:shadow-2xl active:scale-95'
        )}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-2xl bg-purple-500/30 animate-ping opacity-75" />
        )}
        <Bot className={cn('w-6 h-6 transition-all duration-300', isOpen ? 'text-white/60' : 'text-white')} />
      </button>
    </div>
  )
}
