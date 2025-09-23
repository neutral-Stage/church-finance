'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Filter, X, RotateCcw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Fund } from '@/types/database'

export interface FilterConfig {
  dateRange: {
    startDate: string
    endDate: string
    preset: 'custom' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'ytd'
  }
  transactionFilters: {
    types: string[]
    categories: string[]
    fundIds: string[]
    paymentMethods: string[]
    amountRange: { min: number | null; max: number | null }
  }
  offeringFilters: {
    types: string[]
    amountRange: { min: number | null; max: number | null }
  }
  billFilters: {
    statuses: string[]
    categories: string[]
    vendorNames: string[]
    fundIds: string[]
    overdue: boolean
  }
  advanceFilters: {
    statuses: string[]
    recipients: string[]
    overdue: boolean
  }
  fundFilters: {
    fundIds: string[]
    balanceRange: { min: number | null; max: number | null }
  }
}

interface AdvancedFiltersProps {
  filters: FilterConfig
  onFiltersChange: (filters: FilterConfig) => void
  funds: Fund[]
  availableCategories: {
    transaction: string[]
    offering: string[]
    bill: string[]
  }
  availableVendors: string[]
  availableRecipients: string[]
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  funds,
  availableCategories,
  availableVendors,
  availableRecipients
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'date' | 'transactions' | 'offerings' | 'bills' | 'advances' | 'funds'>('date')
  const [savedFilters, setSavedFilters] = useState<{ name: string; config: FilterConfig }[]>([])

  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'custom', label: 'Custom Range' }
  ]

  const transactionTypes = ['income', 'expense']
  const paymentMethods = ['cash', 'bank', 'check', 'card', 'transfer']
  const offeringTypes = ['tithe', 'offering', 'special', 'mission']
  const billStatuses = ['pending', 'paid', 'overdue', 'cancelled']
  const advanceStatuses = ['outstanding', 'partial', 'returned']

  const updateFilters = (section: keyof FilterConfig, updates: any) => {
    onFiltersChange({
      ...filters,
      [section]: {
        ...filters[section],
        ...updates
      }
    })
  }

  const resetFilters = () => {
    const defaultFilters: FilterConfig = {
      dateRange: {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        preset: 'month'
      },
      transactionFilters: {
        types: [],
        categories: [],
        fundIds: [],
        paymentMethods: [],
        amountRange: { min: null, max: null }
      },
      offeringFilters: {
        types: [],
        amountRange: { min: null, max: null }
      },
      billFilters: {
        statuses: [],
        categories: [],
        vendorNames: [],
        fundIds: [],
        overdue: false
      },
      advanceFilters: {
        statuses: [],
        recipients: [],
        overdue: false
      },
      fundFilters: {
        fundIds: [],
        balanceRange: { min: null, max: null }
      }
    }
    onFiltersChange(defaultFilters)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.transactionFilters.types.length > 0) count++
    if (filters.transactionFilters.categories.length > 0) count++
    if (filters.transactionFilters.fundIds.length > 0) count++
    if (filters.transactionFilters.paymentMethods.length > 0) count++
    if (filters.transactionFilters.amountRange.min !== null || filters.transactionFilters.amountRange.max !== null) count++
    if (filters.offeringFilters.types.length > 0) count++
    if (filters.offeringFilters.amountRange.min !== null || filters.offeringFilters.amountRange.max !== null) count++
    if (filters.billFilters.statuses.length > 0) count++
    if (filters.billFilters.categories.length > 0) count++
    if (filters.billFilters.vendorNames.length > 0) count++
    if (filters.billFilters.fundIds.length > 0) count++
    if (filters.billFilters.overdue) count++
    if (filters.advanceFilters.statuses.length > 0) count++
    if (filters.advanceFilters.recipients.length > 0) count++
    if (filters.advanceFilters.overdue) count++
    if (filters.fundFilters.fundIds.length > 0) count++
    if (filters.fundFilters.balanceRange.min !== null || filters.fundFilters.balanceRange.max !== null) count++
    return count
  }

  const saveCurrentFilters = () => {
    const name = prompt('Enter a name for this filter preset:')
    if (name) {
      const newSavedFilter = { name, config: filters }
      setSavedFilters(prev => [...prev, newSavedFilter])
      localStorage.setItem('reportsFilters', JSON.stringify([...savedFilters, newSavedFilter]))
    }
  }

  const loadSavedFilters = (config: FilterConfig) => {
    onFiltersChange(config)
    setIsOpen(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('reportsFilters')
    if (saved) {
      setSavedFilters(JSON.parse(saved))
    }
  }, [])

  const renderDateFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Date Preset</Label>
        <Select
          value={filters.dateRange.preset}
          onValueChange={(value) => updateFilters('dateRange', { preset: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map(preset => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.dateRange.preset === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Start Date</Label>
            <Input
              type="date"
              value={filters.dateRange.startDate}
              onChange={(e) => updateFilters('dateRange', { startDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">End Date</Label>
            <Input
              type="date"
              value={filters.dateRange.endDate}
              onChange={(e) => updateFilters('dateRange', { endDate: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderTransactionFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Transaction Types</Label>
        <div className="mt-2 space-y-2">
          {transactionTypes.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`transaction-type-${type}`}
                checked={filters.transactionFilters.types.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilters('transactionFilters', {
                      types: [...filters.transactionFilters.types, type]
                    })
                  } else {
                    updateFilters('transactionFilters', {
                      types: filters.transactionFilters.types.filter(t => t !== type)
                    })
                  }
                }}
              />
              <Label htmlFor={`transaction-type-${type}`} className="capitalize">{type}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Categories</Label>
        <Select
          value=""
          onValueChange={(value) => {
            if (!filters.transactionFilters.categories.includes(value)) {
              updateFilters('transactionFilters', {
                categories: [...filters.transactionFilters.categories, value]
              })
            }
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Add category filter" />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.transaction.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 flex flex-wrap gap-1">
          {filters.transactionFilters.categories.map(category => (
            <Badge key={category} variant="secondary" className="text-xs">
              {category}
              <X
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => updateFilters('transactionFilters', {
                  categories: filters.transactionFilters.categories.filter(c => c !== category)
                })}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Amount Range</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Input
            type="number"
            placeholder="Min amount"
            value={filters.transactionFilters.amountRange.min || ''}
            onChange={(e) => updateFilters('transactionFilters', {
              amountRange: {
                ...filters.transactionFilters.amountRange,
                min: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
          <Input
            type="number"
            placeholder="Max amount"
            value={filters.transactionFilters.amountRange.max || ''}
            onChange={(e) => updateFilters('transactionFilters', {
              amountRange: {
                ...filters.transactionFilters.amountRange,
                max: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
        </div>
      </div>
    </div>
  )

  const renderOfferingFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Offering Types</Label>
        <div className="mt-2 space-y-2">
          {offeringTypes.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`offering-type-${type}`}
                checked={filters.offeringFilters.types.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilters('offeringFilters', {
                      types: [...filters.offeringFilters.types, type]
                    })
                  } else {
                    updateFilters('offeringFilters', {
                      types: filters.offeringFilters.types.filter(t => t !== type)
                    })
                  }
                }}
              />
              <Label htmlFor={`offering-type-${type}`} className="capitalize">{type}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Amount Range</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Input
            type="number"
            placeholder="Min amount"
            value={filters.offeringFilters.amountRange.min || ''}
            onChange={(e) => updateFilters('offeringFilters', {
              amountRange: {
                ...filters.offeringFilters.amountRange,
                min: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
          <Input
            type="number"
            placeholder="Max amount"
            value={filters.offeringFilters.amountRange.max || ''}
            onChange={(e) => updateFilters('offeringFilters', {
              amountRange: {
                ...filters.offeringFilters.amountRange,
                max: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
        </div>
      </div>
    </div>
  )

  const renderBillFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Bill Status</Label>
        <div className="mt-2 space-y-2">
          {billStatuses.map(status => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`bill-status-${status}`}
                checked={filters.billFilters.statuses.includes(status)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilters('billFilters', {
                      statuses: [...filters.billFilters.statuses, status]
                    })
                  } else {
                    updateFilters('billFilters', {
                      statuses: filters.billFilters.statuses.filter(s => s !== status)
                    })
                  }
                }}
              />
              <Label htmlFor={`bill-status-${status}`} className="capitalize">{status}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="overdue-bills"
          checked={filters.billFilters.overdue}
          onCheckedChange={(checked) => updateFilters('billFilters', { overdue: !!checked })}
        />
        <Label htmlFor="overdue-bills">Show only overdue bills</Label>
      </div>
    </div>
  )

  const renderAdvanceFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Advance Status</Label>
        <div className="mt-2 space-y-2">
          {advanceStatuses.map(status => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`advance-status-${status}`}
                checked={filters.advanceFilters.statuses.includes(status)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilters('advanceFilters', {
                      statuses: [...filters.advanceFilters.statuses, status]
                    })
                  } else {
                    updateFilters('advanceFilters', {
                      statuses: filters.advanceFilters.statuses.filter(s => s !== status)
                    })
                  }
                }}
              />
              <Label htmlFor={`advance-status-${status}`} className="capitalize">{status}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="overdue-advances"
          checked={filters.advanceFilters.overdue}
          onCheckedChange={(checked) => updateFilters('advanceFilters', { overdue: !!checked })}
        />
        <Label htmlFor="overdue-advances">Show only overdue advances</Label>
      </div>
    </div>
  )

  const renderFundFilters = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Funds</Label>
        <Select
          value=""
          onValueChange={(value) => {
            if (!filters.fundFilters.fundIds.includes(value)) {
              updateFilters('fundFilters', {
                fundIds: [...filters.fundFilters.fundIds, value]
              })
            }
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Add fund filter" />
          </SelectTrigger>
          <SelectContent>
            {funds.map(fund => (
              <SelectItem key={fund.id} value={fund.id}>
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 flex flex-wrap gap-1">
          {filters.fundFilters.fundIds.map(fundId => {
            const fund = funds.find(f => f.id === fundId)
            return fund ? (
              <Badge key={fundId} variant="secondary" className="text-xs">
                {fund.name}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => updateFilters('fundFilters', {
                    fundIds: filters.fundFilters.fundIds.filter(id => id !== fundId)
                  })}
                />
              </Badge>
            ) : null
          })}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Balance Range</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Input
            type="number"
            placeholder="Min balance"
            value={filters.fundFilters.balanceRange.min || ''}
            onChange={(e) => updateFilters('fundFilters', {
              balanceRange: {
                ...filters.fundFilters.balanceRange,
                min: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
          <Input
            type="number"
            placeholder="Max balance"
            value={filters.fundFilters.balanceRange.max || ''}
            onChange={(e) => updateFilters('fundFilters', {
              balanceRange: {
                ...filters.fundFilters.balanceRange,
                max: e.target.value ? parseFloat(e.target.value) : null
              }
            })}
          />
        </div>
      </div>
    </div>
  )

  const tabs = [
    { id: 'date', label: 'Date Range', content: renderDateFilters },
    { id: 'transactions', label: 'Transactions', content: renderTransactionFilters },
    { id: 'offerings', label: 'Offerings', content: renderOfferingFilters },
    { id: 'bills', label: 'Bills', content: renderBillFilters },
    { id: 'advances', label: 'Advances', content: renderAdvanceFilters },
    { id: 'funds', label: 'Funds', content: renderFundFilters }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-1">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveCurrentFilters}
            className="flex items-center gap-1"
          >
            <Save className="h-3 w-3" />
            Save
          </Button>
        </div>
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Tabs */}
              <div className="lg:w-48">
                <div className="space-y-1">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab(tab.id as any)}
                      className="w-full justify-start"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                  <div className="mt-6">
                    <Label className="text-sm font-medium">Saved Filters</Label>
                    <div className="mt-2 space-y-1">
                      {savedFilters.map((saved, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => loadSavedFilters(saved.config)}
                          className="w-full justify-start text-xs"
                        >
                          {saved.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                {tabs.find(tab => tab.id === activeTab)?.content()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}