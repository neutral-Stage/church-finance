'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'member' | 'transaction' | 'offering' | 'report' | 'bill' | 'advance'
  url: string
  metadata?: Record<string, unknown>
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
  { type: 'advance', label: 'Advances', icon: Clock, color: 'bg-yellow-500' }
]

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!user) return

    setLoading(true)
    try {
      const searchResults: SearchResult[] = []

      // Search members
      const { data: members } = await supabase
        .from('members')
        .select('id, full_name, email, phone')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5)

      if (members) {
        members.forEach(member => {
          searchResults.push({
            id: member.id,
            title: member.full_name,
            description: `${member.email} - ${member.phone}`,
            type: 'member',
            url: `/members/${member.id}`,
            metadata: member
          })
        })
      }

      // Search transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, description, amount, transaction_date, type')
        .or(`description.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%`)
        .order('transaction_date', { ascending: false })
        .limit(5)

      if (transactions) {
        transactions.forEach(transaction => {
          searchResults.push({
            id: transaction.id,
            title: transaction.description,
            description: `$${transaction.amount} - ${transaction.type} - ${new Date(transaction.transaction_date).toLocaleDateString()}`,
            type: 'transaction',
            url: `/transactions/${transaction.id}`,
            metadata: transaction
          })
        })
      }

      // Search offerings
      const { data: offerings } = await supabase
        .from('offerings')
        .select('id, offering_type, amount, offering_date, notes')
        .or(`offering_type.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
        .order('offering_date', { ascending: false })
        .limit(5)

      if (offerings) {
        offerings.forEach(offering => {
          searchResults.push({
            id: offering.id,
            title: offering.offering_type,
            description: `$${offering.amount} - ${new Date(offering.offering_date).toLocaleDateString()}`,
            type: 'offering',
            url: `/offerings/${offering.id}`,
            metadata: offering
          })
        })
      }

      // Search bills
      const { data: bills } = await supabase
        .from('bills')
        .select('id, description, amount, due_date, status')
        .or(`description.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`)
        .order('due_date', { ascending: false })
        .limit(5)

      if (bills) {
        bills.forEach(bill => {
          searchResults.push({
            id: bill.id,
            title: bill.description,
            description: `$${bill.amount} - Due: ${new Date(bill.due_date).toLocaleDateString()} - ${bill.status}`,
            type: 'bill',
            url: `/bills/${bill.id}`,
            metadata: bill
          })
        })
      }

      // Search advances
      const { data: advances } = await supabase
        .from('advances')
        .select('id, description, amount, advance_date, status')
        .or(`description.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`)
        .order('advance_date', { ascending: false })
        .limit(5)

      if (advances) {
        advances.forEach(advance => {
          searchResults.push({
            id: advance.id,
            title: advance.description,
            description: `$${advance.amount} - ${new Date(advance.advance_date).toLocaleDateString()} - ${advance.status}`,
            type: 'advance',
            url: `/advances/${advance.id}`,
            metadata: advance
          })
        })
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } catch {
      // Silently handle search error
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const searchWithQuery = async () => {
      if (query.trim()) {
        await performSearch(query)
      } else {
        setResults([])
        setLoading(false)
      }
    }
    searchWithQuery()
  }, [query, performSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleResultClick(results[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url)
    onClose()
    setQuery('')
    setResults([])
  }

  const getCategoryInfo = (type: string) => {
    return searchCategories.find(cat => cat.type === type) || searchCategories[0]
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Search Church Finance
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search members, transactions, offerings, bills..."
              className="pl-10 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all duration-200"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-white/50 hover:text-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {query.length > 0 && query.length <= 2 && (
            <div className="glass-card-light p-4 rounded-xl mt-4">
              <p className="text-white/80 text-sm text-center">
                Type at least 3 characters to search
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md animate-pulse" />
                <div className="relative animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              </div>
              <span className="ml-3 text-white/80">Searching...</span>
            </div>
          )}

          {!loading && query.length > 2 && results.length === 0 && (
            <div className="text-center py-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
                <Search className="relative h-12 w-12 text-white/30 mx-auto" />
              </div>
              <p className="text-white/70">No results found for &quot;{query}&quot;</p>
              <p className="text-white/50 text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 max-h-96 overflow-y-auto space-y-4">
              {Object.entries(groupedResults).map(([type, typeResults]) => {
                const categoryInfo = getCategoryInfo(type)
                const Icon = categoryInfo.icon
                
                return (
                  <div key={type}>
                    <div className="flex items-center mb-3">
                      <div className={`relative mr-3`}>
                        <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
                        <div className={`relative p-2 rounded-full ${categoryInfo.color} backdrop-blur-sm border border-white/20`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <h3 className="text-white/90 text-sm font-semibold">{categoryInfo.label}</h3>
                    </div>
                    
                    <div className="space-y-2">
                      {typeResults.map((result) => {
                        const globalIndex = results.indexOf(result)
                        return (
                          <div
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`group p-4 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                              selectedIndex === globalIndex
                                ? 'bg-purple-500/20 border border-purple-400/30 shadow-lg backdrop-blur-sm'
                                : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-md'
                            }`}
                          >
                            {selectedIndex === globalIndex && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-blue-400 rounded-r-full" />
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-semibold truncate group-hover:text-white transition-colors">{result.title}</h4>
                                <p className="text-white/70 text-sm truncate mt-1">{result.description}</p>
                              </div>
                              <div className="flex items-center ml-4">
                                <Badge 
                                  variant="secondary" 
                                  className={`${categoryInfo.color} text-white text-xs mr-3 backdrop-blur-sm border-0 hover:scale-105 transition-all duration-200`}
                                >
                                  {categoryInfo.label.slice(0, -1)}
                                </Badge>
                                <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs text-center">
                Use up/down arrows to navigate, Enter to select, Esc to close
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}