'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Search } from 'lucide-react'
import { AdminFilters } from '@/types/admin'

interface FilterOption {
  value: string
  label: string
}

interface AdminSearchFiltersProps<F extends AdminFilters> {
  filters: F
  onFiltersChange: (filters: Partial<F>) => void
  searchPlaceholder?: string
  sortOptions?: FilterOption[]
  additionalFilters?: {
    key: keyof F
    label: string
    options: FilterOption[]
  }[]
  className?: string
}

export function AdminSearchFilters<F extends AdminFilters>({
  filters,
  onFiltersChange,
  searchPlaceholder = 'Search...',
  sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Created Date' }
  ],
  additionalFilters = [],
  className = ''
}: AdminSearchFiltersProps<F>) {
  return (
    <GlassCard className={className}>
      <GlassCardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder={searchPlaceholder}
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value } as Partial<F>)}
              className="pl-10 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/15 focus:bg-white/15 focus:border-white/30"
            />
          </div>

          {/* Additional Filters */}
          {additionalFilters.map((filter) => (
            <div key={String(filter.key)} className="lg:col-span-2">
              <Select
                value={String(filters[filter.key])}
                onValueChange={(value) =>
                  onFiltersChange({ [filter.key]: value } as Partial<F>)
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Sort By */}
          <div className="lg:col-span-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) =>
                onFiltersChange({ sortBy: value } as Partial<F>)
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="lg:col-span-2">
            <Select
              value={filters.sortOrder}
              onValueChange={(value: 'asc' | 'desc') =>
                onFiltersChange({ sortOrder: value } as Partial<F>)
              }
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}