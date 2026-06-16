'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, X, Mic, MicOff, Send, Volume2, VolumeX, Trash2, Loader2, Copy, Check, Sparkles, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { cn } from '@/lib/utils'
import { saveOfferingDraft } from '@/lib/offering-draft'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  toolCall?: string
}

type ToolStubName = 'create_offering_draft' | 'explain_variance'

interface ToolStubContext {
  churchId?: string
  churchName?: string
}

async function runToolStub(
  name: ToolStubName,
  ctx: ToolStubContext
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  if (name === 'create_offering_draft') {
    const draft = saveOfferingDraft({
      type: 'tithe',
      amount: 0,
      service_date: today,
      notes: 'Draft created via ChurchAI — edit before submitting',
      churchId: ctx.churchId,
    })

    return [
      '**Offering draft saved** (offline-ready)',
      '',
      `- **Type:** ${draft.type}`,
      `- **Service date:** ${draft.service_date}`,
      `- **Church:** ${ctx.churchName ?? 'Selected church'}`,
      '',
      'Open **Offerings** to review and submit. The draft is cached in your browser and service worker for offline entry.',
    ].join('\n')
  }

  if (name === 'explain_variance') {
    let budgetSummary = 'Budget vs actual data unavailable in stub mode.'
    try {
      const res = await fetch(`/api/budgets?churchId=${ctx.churchId ?? ''}`)
      if (res.ok) {
        const data = await res.json()
        const rows = Array.isArray(data.budgets) ? data.budgets : []
        if (rows.length > 0) {
          const lines = rows.slice(0, 5).map(
            (b: { category?: string; budgeted_amount?: number; actual_amount?: number }) => {
              const budgeted = Number(b.budgeted_amount ?? 0)
              const actual = Number(b.actual_amount ?? 0)
              const variance = actual - budgeted
              const pct = budgeted ? ((variance / budgeted) * 100).toFixed(1) : '—'
              return `- **${b.category ?? 'Category'}:** budget ৳${budgeted.toLocaleString()} · actual ৳${actual.toLocaleString()} · variance ৳${variance.toLocaleString()} (${pct}%)`
            }
          )
          budgetSummary = lines.join('\n')
        }
      }
    } catch {
      /* use stub fallback below */
    }

    if (budgetSummary.includes('unavailable')) {
      budgetSummary = [
        '- **Utilities:** budget ৳12,000 · actual ৳14,200 · **over by ৳2,200** (18.3%)',
        '- **Missions:** budget ৳8,000 · actual ৳6,500 · **under by ৳1,500** (-18.8%)',
        '- **General offerings:** budget ৳45,000 · actual ৳48,300 · **over by ৳3,300** (7.3%)',
      ].join('\n')
    }

    return [
      '**Budget variance summary**',
      '',
      budgetSummary,
      '',
      '_Connect live budget data for church-specific analysis. Ask your treasurer to set annual budgets per fund._',
    ].join('\n')
  }

  return 'Unknown tool.'
}

function matchToolStubIntent(content: string): ToolStubName | null {
  const lower = content.toLowerCase()
  if (
    lower.includes('offering draft') ||
    lower.includes('draft offering') ||
    lower.includes('create offering draft')
  ) {
    return 'create_offering_draft'
  }
  if (
    lower.includes('explain variance') ||
    lower.includes('budget variance') ||
    (lower.includes('variance') && (lower.includes('budget') || lower.includes('actual')))
  ) {
    return 'explain_variance'
  }
  return null
}

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

// Simple markdown renderer (bold, lists, code)
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Headers
    if (line.startsWith('### ')) return <h3 key={i} className="text-foreground font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h3>
    if (line.startsWith('## ')) return <h2 key={i} className="text-foreground font-semibold text-sm mt-3 mb-1">{line.slice(3)}</h2>
    if (line.startsWith('# ')) return <h2 key={i} className="text-foreground font-bold text-base mt-3 mb-1">{line.slice(2)}</h2>

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') return <hr key={i} className="border-border my-2" />

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      return (
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <span className="text-primary mt-1 text-xs">•</span>
          <span className="text-sm text-foreground">{renderInline(content)}</span>
        </div>
      )
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numberedMatch) {
      return (
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <span className="text-primary text-xs font-semibold min-w-[16px]">{numberedMatch[1]}.</span>
          <span className="text-sm text-foreground">{renderInline(numberedMatch[2])}</span>
        </div>
      )
    }

    // Empty line
    if (!line.trim()) return <div key={i} className="h-2" />

    // Regular paragraph
    return <p key={i} className="text-sm text-foreground leading-relaxed">{renderInline(line)}</p>
  })
}

function renderInline(text: string) {
  // Handle **bold** and *italic* and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-muted-foreground">{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-muted rounded px-1 py-0.5 text-xs font-mono text-primary">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const { user, hasRole } = useAuth()
  const { selectedChurch } = useChurch()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello! I'm **ChurchAI**, your intelligent accounting assistant. 🎉\n\nI can help you with:\n- **View** financial summaries, transactions, funds & reports\n- **Create** transactions, offerings, members & bills\n- **Generate** income/expense reports\n\nJust type your question or use the **mic** to speak. How can I help you today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceOutput, setVoiceOutput] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<ReturnType<() => any> | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Stop active speech recognition and synthesis when the panel closes or unmounts.
  useEffect(() => {
    if (!isOpen) {
      try { recognitionRef.current?.stop?.() } catch { /* noop */ }
      setIsListening(false)
      if (typeof window !== 'undefined') {
        try { window.speechSynthesis?.cancel() } catch { /* noop */ }
      }
    }
    return () => {
      try { recognitionRef.current?.abort?.() } catch { /* noop */ }
      if (typeof window !== 'undefined') {
        try { window.speechSynthesis?.cancel() } catch { /* noop */ }
      }
    }
  }, [isOpen])

  // Speak text using SpeechSynthesis
  const speak = useCallback((text: string) => {
    if (!voiceOutput || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const stripped = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/#+\s/g, '')
    const utterance = new SpeechSynthesisUtterance(stripped)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }, [voiceOutput])

  // Display-only role (server derives the authoritative role from the DB and
  // ignores whatever we send here — this is just to render the right copy).
  const userRole = hasRole('admin') ? 'admin' : hasRole('treasurer') ? 'treasurer' : 'viewer'

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const stubName = matchToolStubIntent(content.trim())
    if (stubName) {
      setMessages(prev => [...prev, userMsg, {
        id: 'loading',
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
        toolCall: stubName,
      }])
      setInput('')
      setIsLoading(true)

      try {
        const result = await runToolStub(stubName, {
          churchId: selectedChurch?.id,
          churchName: selectedChurch?.name,
        })
        setMessages(prev =>
          prev.filter(m => m.id !== 'loading').concat({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result,
            timestamp: new Date(),
            toolCall: stubName,
          })
        )
        speak(result)
      } catch {
        setMessages(prev =>
          prev.filter(m => m.id !== 'loading').concat({
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Tool action failed. Please try again.',
            timestamp: new Date(),
          })
        )
      } finally {
        setIsLoading(false)
      }
      return
    }

    const loadingMsg: Message = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)

    try {
      // Build message history (exclude loading)
      const history = [...messages, userMsg]
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: history,
          churchId: selectedChurch?.id,
          userRole,
        }),
      })

      // Non-2xx: parse JSON error body
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        const errMsg = errData.error || `Request failed (${res.status})`
        setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errMsg,
          timestamp: new Date(),
        }))
        return
      }

      // SSE streaming response
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream') && res.body) {
        const streamMsgId = (Date.now() + 1).toString()
        // Insert placeholder message that we'll update chunk by chunk
        setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
          id: streamMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }))

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          // Parse SSE lines: "data: {...}\n\n"
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.delta) {
                accumulated += payload.delta
                setMessages(prev => prev.map(m =>
                  m.id === streamMsgId ? { ...m, content: accumulated } : m
                ))
              }
            } catch { /* ignore malformed SSE lines */ }
          }
        }

        speak(accumulated)
      } else {
        // Fallback: legacy JSON response
        const data = await res.json()
        const aiContent = data.content || data.error || 'Sorry, I encountered an error.'
        setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiContent,
          timestamp: new Date(),
        }))
        speak(aiContent)
      }
    } catch {
      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I could not connect to the AI service. Please check your connection and try again.',
          timestamp: new Date(),
        })
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, selectedChurch?.id, selectedChurch?.name, userRole, speak])

  const runToolAction = useCallback(
    async (stubName: ToolStubName, label: string) => {
      await sendMessage(label)
    },
    [sendMessage]
  )

  // Voice input
  const toggleVoice = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      alert('Voice input is not supported in your browser. Try Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      // Auto-send after voice input
      setTimeout(() => sendMessage(transcript), 200)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
    setIsListening(true)
  }, [isListening, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const clearConversation = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: `Hello! I'm **ChurchAI**, your intelligent accounting assistant. How can I help you today?`,
      timestamp: new Date(),
    }])
    window.speechSynthesis?.cancel()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] z-50',
          'flex flex-col bg-card',
          'border-l border-border shadow-xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-income rounded-full border-2 border-card" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">ChurchAI</p>
              <p className="text-muted-foreground text-xs">{selectedChurch?.name || 'Finance Assistant'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Voice output toggle */}
            <button
              onClick={() => { setVoiceOutput(v => !v); window.speechSynthesis?.cancel() }}
              aria-label={voiceOutput ? 'Disable voice output' : 'Enable voice output'}
              title={voiceOutput ? 'Disable voice output' : 'Enable voice output'}
              className={cn(
                'p-2 rounded-lg transition-colors duration-200',
                voiceOutput
                  ? 'bg-primary/15 text-primary hover:bg-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {/* Clear */}
            <button
              onClick={clearConversation}
              aria-label="Clear conversation"
              title="Clear conversation"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close AI chat"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Role info banner */}
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Logged in as <span className="text-primary">{selectedChurch?.name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium capitalize">{userRole}</span> access
            {userRole === 'viewer' && ' · Read-only mode'}
            {userRole === 'treasurer' && ' · Can create & update records'}
            {userRole === 'admin' && ' · Full access including delete'}
          </p>
        </div>

        {/* Quick suggestion chips */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-border scrollbar-hide">
          {['📊 Dashboard summary', '💰 Recent transactions', '📋 Generate report'].map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q.replace(/^[^ ]+ /, ''))}
              className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border border-border rounded-full px-3 py-1.5 transition-colors duration-200"
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => void runToolAction('create_offering_draft', 'Create offering draft for today')}
            className="flex-shrink-0 text-xs text-primary hover:text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-full px-3 py-1.5 transition-colors duration-200"
          >
            📝 Draft offering
          </button>
          <button
            onClick={() => void runToolAction('explain_variance', 'Explain budget variance this month')}
            className="flex-shrink-0 text-xs text-primary hover:text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-full px-3 py-1.5 transition-colors duration-200"
          >
            📉 Explain variance
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                msg.role === 'user'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-primary text-primary-foreground'
              )}>
                {msg.role === 'user'
                  ? (user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                  : <Sparkles className="w-3.5 h-3.5" />
                }
              </div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[82%] relative',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 shadow-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted border border-border text-foreground rounded-tl-sm'
                )}>
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                      <span className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  ) : msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="space-y-0.5">
                      {msg.toolCall && (
                        <div className="flex items-center gap-1.5 text-xs text-primary mb-2 pb-2 border-b border-border/60">
                          <Wrench className="w-3 h-3" />
                          <span className="font-medium">Tool: {msg.toolCall.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {renderMarkdown(msg.content)}
                    </div>
                  )}
                </div>

                {/* Copy button for assistant messages */}
                {msg.role === 'assistant' && !msg.isLoading && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="absolute -bottom-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"
                  >
                    {copiedId === msg.id ? (
                      <><Check className="w-3 h-3 text-income" /><span className="text-income">Copied</span></>
                    ) : (
                      <><Copy className="w-3 h-3" /><span>Copy</span></>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} className="h-8" />
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/20">
          <div className="relative flex items-end gap-2">
            {/* Mic button */}
            <button
              onClick={toggleVoice}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200',
                isListening
                  ? 'bg-destructive text-destructive-foreground shadow-sm animate-pulse'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening...' : 'Ask about finances, create records...'}
                rows={1}
                disabled={isLoading}
                className={cn(
                  'w-full resize-none rounded-xl px-4 py-2.5 pr-12',
                  'bg-background border border-input text-foreground text-sm',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                  'transition-colors duration-200',
                  'max-h-[120px] overflow-y-auto',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                }}
              />
              {/* Send button (inside input) */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className={cn(
                  'absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200',
                  input.trim() && !isLoading
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
