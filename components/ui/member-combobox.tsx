"use client"

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useChurch } from '@/contexts/ChurchContext'

interface Member {
  id: string
  name: string
  fellowship_name?: string
}

interface MemberComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function MemberCombobox({
  value,
  onValueChange,
  placeholder = "Search members...",
  className
}: MemberComboboxProps) {
  const { selectedChurch } = useChurch()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Fetch members based on search term
  const fetchMembers = useCallback(async (search: string = '') => {
    setLoading(true)

    try {
      // Only fetch members if a church is selected
      if (!selectedChurch) {
        setMembers([])
        return
      }

      let query = supabase
        .from('members')
        .select('id, name, fellowship_name')
        .eq('church_id', selectedChurch.id)
        .limit(20)
        .order('name')

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,fellowship_name.ilike.%${search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setMembers((data || []) as Member[])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [selectedChurch])

  // Fetch initial members and search results
  useEffect(() => {
    fetchMembers(searchTerm)
  }, [searchTerm, selectedChurch, fetchMembers])

  // Find selected member when value changes
  useEffect(() => {
    if (value && value !== 'none' && selectedChurch) {
      const member = members.find(m => m.id === value)
      if (member) {
        setSelectedMember(member)
      } else {
        // Fetch the specific member if not in current list, but only for current church
        (async () => {
          try {
            const { data } = await supabase
              .from('members')
              .select('id, name, fellowship_name')
              .eq('id', value)
              .eq('church_id', selectedChurch.id)
              .single()
            if (data) setSelectedMember(data as Member)
          } catch {
            // Member not found in current church, clear selection
            setSelectedMember(null)
            onValueChange('')
          }
        })()
      }
    } else {
      setSelectedMember(null)
    }
  }, [value, members, selectedChurch, onValueChange])

  const handleSelect = (member: Member) => {
    setSelectedMember(member)
    onValueChange(member.id)
    setOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    setSelectedMember(null)
    onValueChange('')
    setSearchTerm('')
  }

  const displayValue = selectedMember 
    ? `${selectedMember.name}${selectedMember.fellowship_name ? ` (${selectedMember.fellowship_name})` : ''}`
    : ''

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors cursor-pointer",
          "flex items-center justify-between px-3 py-2 min-h-[40px]",
          className
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
          {selectedMember ? (
            <span className="truncate text-foreground">
              {displayValue}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">
              {placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {selectedMember && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )} 
          />
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-muted-foreground">
                <div className="inline-block w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin"></div>
                <span className="ml-2">Searching...</span>
              </div>
            ) : (
              <>
                {members.length === 0 && searchTerm ? (
                  <div className="p-3 text-center text-muted-foreground">
                    No members found
                  </div>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelect(member)}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-popover-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{member.name}</div>
                          {member.fellowship_name && (
                            <div className="text-sm text-muted-foreground truncate">
                              {member.fellowship_name}
                            </div>
                          )}
                        </div>
                        {value === member.id && <Check className="h-4 w-4 ml-2 flex-shrink-0" />}
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}