'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Users,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  X,
  Plus,
  Gift,
  Building2,
  Command,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useChurch } from '@/contexts/ChurchContext'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'member' | 'transaction' | 'offering' | 'report' | 'bill' | 'advance'
  url: string
  metadata?: Record<string, unknown>
}

interface CommandAction {
  id: string
  label: string
  description: string
  icon: typeof Plus
  shortcut?: string
  onSelect: () => void
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const searchCategories = [
  { type: 'member', label: 'Members', icon: Users, color: 'bg-blue-500' },
  { type: 'transaction', label: 'Transactions', icon: DollarSign, color: 'bg-green-500' },
  { type: 'offering', label: 'Offerings', icon: TrendingUp, color: 'bg-purple-500' },
  { type: 'report', label: 'Reports', icon: FileText, color: 'bg-orange-500' },
  { type: 'bill', label: 'Bills', icon: Calendar, color: 'bg-red-500' },
  { type: 'advance', label: 'Advances', icon: Clock, color: 'bg-yellow-500' },
]

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [churchPickerOpen, setChurchPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user } = useAuth()
  const { availableChurches, setSelectedChurch, selectedChurch } = useChurch()

  const navigateAndClose = useCallback(
    (path: string) => {
      router.push(path)
      onClose()
      setQuery('')
      setResults([])
      setChurchPickerOpen(false)
    },
    [router, onClose]
  )

  const quickActions: CommandAction[] = useMemo(
    () => [
      {
        id: 'new-transaction',
        label: 'New Transaction',
        description: 'Record income or expense',
        icon: Plus,
        shortcut: 'T',
        onSelect: () => navigateAndClose('/transactions'),
      },
      {
        id: 'record-offering',
        label: 'Record Offering',
        description: 'Log tithes and offerings',
        icon: Gift,
        shortcut: 'O',
        onSelect: () => navigateAndClose('/offerings'),
      },
      {
        id: 'switch-church',
        label: 'Switch Church',
        description: selectedChurch?.name ?? 'Change active church',
        icon: Building2,
        shortcut: 'C',
        onSelect: () => setChurchPickerOpen(true),
      },
    ],
    [navigateAndClose, selectedChurch?.name]
  )

  const flatItems = useMemo(() => {
    if (query.trim().length > 2) {
      return results.map((r) => ({ kind: 'result' as const, data: r }))
    }
    if (churchPickerOpen) {
      return availableChurches.map((c) => ({ kind: 'church' as const, data: c }))
    }
    return quickActions.map((a) => ({ kind: 'action' as const, data: a }))
  }, [query, results, quickActions, churchPickerOpen, availableChurches])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setResults([])
      setChurchPickerOpen(false)
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, churchPickerOpen])

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!user) return

      setLoading(true)
      try {
        const searchResults: SearchResult[] = []

        const { data: members } = await supabase
          .from('members')
          .select('id, name, phone')
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(5)

        members?.forEach((member) => {
          searchResults.push({
            id: member.id,
            title: member.name,
            description: `Phone: ${member.phone || 'N/A'}`,
            type: 'member',
            url: `/members/${member.id}`,
          })
        })

        const { data: transactions } = await supabase
          .from('transactions')
          .select('id, description, amount, transaction_date, type')
          .or(`description.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%`)
          .order('transaction_date', { ascending: false })
          .limit(5)

        transactions?.forEach((transaction) => {
          searchResults.push({
            id: transaction.id,
            title: transaction.description,
            description: `$${transaction.amount} - ${transaction.type} - ${new Date(transaction.transaction_date).toLocaleDateString()}`,
            type: 'transaction',
            url: `/transactions/${transaction.id}`,
          })
        })

        const { data: offerings } = await supabase
          .from('offerings')
          .select('id, type, amount, service_date, notes')
          .or(`type.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
          .order('service_date', { ascending: false })
          .limit(5)

        offerings?.forEach((offering) => {
          searchResults.push({
            id: offering.id,
            title: offering.type,
            description: `$${offering.amount} - ${new Date(offering.service_date).toLocaleDateString()}`,
            type: 'offering',
            url: `/offerings/${offering.id}`,
          })
        })

        const { data: bills } = await supabase
          .from('bills')
          .select('id, vendor_name, amount, due_date, status')
          .or(`vendor_name.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`)
          .order('due_date', { ascending: false })
          .limit(5)

        bills?.forEach((bill) => {
          searchResults.push({
            id: bill.id,
            title: bill.vendor_name,
            description: `$${bill.amount} - Due: ${new Date(bill.due_date).toLocaleDateString()} - ${bill.status}`,
            type: 'bill',
            url: `/bills/${bill.id}`,
          })
        })

        const { data: advances } = await supabase
          .from('advances')
          .select('id, purpose, amount, advance_date, status, recipient_name')
          .or(`purpose.ilike.%${searchQuery}%,recipient_name.ilike.%${searchQuery}%`)
          .order('advance_date', { ascending: false })
          .limit(5)

        advances?.forEach((advance) => {
          searchResults.push({
            id: advance.id,
            title: advance.recipient_name,
            description: `$${advance.amount} - ${advance.status}`,
            type: 'advance',
            url: `/advances/${advance.id}`,
          })
        })

        setResults(searchResults)
        setSelectedIndex(0)
      } catch {
        // Silently handle search error
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  useEffect(() => {
    const searchWithQuery = async () => {
      if (query.trim().length > 2) {
        await performSearch(query)
      } else {
        setResults([])
        setLoading(false)
      }
    }
    void searchWithQuery()
  }, [query, performSearch])

  const selectItem = useCallback(
    async (index: number) => {
      const item = flatItems[index]
      if (!item) return

      if (item.kind === 'action') {
        item.data.onSelect()
      } else if (item.kind === 'church') {
        await setSelectedChurch(item.data)
        onClose()
        setQuery('')
        setChurchPickerOpen(false)
      } else if (item.kind === 'result') {
        navigateAndClose(item.data.url)
      }
    },
    [flatItems, setSelectedChurch, onClose, navigateAndClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && flatItems.length > 0) {
      e.preventDefault()
      void selectItem(selectedIndex)
    } else if (e.key === 'Escape') {
      if (churchPickerOpen) {
        setChurchPickerOpen(false)
      } else {
        onClose()
      }
    } else if (!query && !churchPickerOpen) {
      const key = e.key.toUpperCase()
      const action = quickActions.find((a) => a.shortcut === key)
      if (action) {
        e.preventDefault()
        action.onSelect()
      }
    }
  }

  const getCategoryInfo = (type: string) => {
    return searchCategories.find((cat) => cat.type === type) || searchCategories[0]
  }

  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = []
      acc[result.type].push(result)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Command className="h-5 w-5 text-primary" />
            Command Palette
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                churchPickerOpen
                  ? 'Select a church...'
                  : 'Search or type a command...'
              }
              className="pl-10 h-11"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!query && !churchPickerOpen && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Actions
                </span>
              </div>
              <div className="space-y-1">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => action.onSelect()}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                        selectedIndex === index
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-accent border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      {action.shortcut && (
                        <kbd className="text-xs px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {churchPickerOpen && (
            <div className="mt-4 max-h-72 overflow-y-auto space-y-1">
              {availableChurches.map((church, index) => (
                <button
                  key={church.id}
                  type="button"
                  onClick={() => void selectItem(index)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                    selectedIndex === index
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-accent border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{church.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {church.role_display_name ?? church.role_name ?? 'Member'}
                      </p>
                    </div>
                  </div>
                  {selectedChurch?.id === church.id && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {query.length > 0 && query.length <= 2 && (
            <div className="bg-muted/50 border border-border p-4 rounded-xl mt-4">
              <p className="text-muted-foreground text-sm text-center">
                Type at least 3 characters to search
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
              <span className="ml-3 text-muted-foreground">Searching...</span>
            </div>
          )}

          {!loading && query.length > 2 && results.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-foreground">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 max-h-96 overflow-y-auto space-y-4">
              {Object.entries(groupedResults).map(([type, typeResults]) => {
                const categoryInfo = getCategoryInfo(type)
                const Icon = categoryInfo.icon

                return (
                  <div key={type}>
                    <div className="flex items-center mb-2 px-1">
                      <div className={`mr-2 p-1.5 rounded-full ${categoryInfo.color}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <h3 className="text-foreground text-xs font-semibold uppercase tracking-wide">
                        {categoryInfo.label}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      {typeResults.map((result) => {
                        const globalIndex = flatItems.findIndex(
                          (i) => i.kind === 'result' && i.data.id === result.id
                        )
                        return (
                          <div
                            key={result.id}
                            onClick={() => navigateAndClose(result.url)}
                            className={cn(
                              'group p-3 rounded-lg cursor-pointer transition-colors',
                              selectedIndex === globalIndex
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-card hover:bg-accent border border-border'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-foreground font-medium text-sm truncate">
                                  {result.title}
                                </h4>
                                <p className="text-muted-foreground text-xs truncate mt-0.5">
                                  {result.description}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs text-center">
              ↑↓ navigate · Enter select · Esc close · T/O/C quick actions when empty
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
