'use client'

import { useState, useEffect, useCallback } from 'react'
import { createAuthenticatedClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ComprehensiveLedgerDialog } from '@/components/comprehensive-ledger-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, MoreHorizontal, FolderOpen, Users, Calendar, CheckCircle, Clock, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { LedgerEntryWithRelations } from '@/lib/server-data'
import type { Database } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']

interface LedgerEntriesClientProps {
  initialData: LedgerEntryWithRelations[]
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canApprove: boolean
    userRole: string | null
  }
}

export function LedgerEntriesClient({ initialData, permissions }: LedgerEntriesClientProps): JSX.Element {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryWithRelations[]>(initialData)
  const [isComprehensiveDialogOpen, setIsComprehensiveDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/ledger-entries?include_subgroups=true&include_bills=true', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch ledger entries')
      }
      
      const data = await response.json()
      setLedgerEntries(data.ledgerEntries || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ledger entries data'
      toast.error(errorMessage)
    }
  }, [])

  // Set up real-time subscription only for updates
  useEffect(() => {
    let subscription: RealtimeChannel | null = null
    
    const setupRealtimeSubscription = async () => {
      try {
        const supabase = await createAuthenticatedClient()
        subscription = supabase
          .channel('ledger_entries_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => {
            fetchData()
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_subgroups' }, () => {
            fetchData()
          })
          .subscribe()
      } catch (error) {
        console.warn('Failed to setup realtime subscription for ledger entries:', error)
        // Fallback to periodic refresh if realtime fails
        const interval = setInterval(fetchData, 30000) // 30 seconds
        return () => clearInterval(interval)
      }
    }
    
    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchData])

  const deleteEntry = async (entryId: string) => {
    if (!permissions.canDelete) {
      toast.error('You do not have permission to delete ledger entries')
      return
    }

    if (!confirm('Are you sure you want to delete this ledger entry? This will also delete all associated subgroups and bills.')) return

    try {
      const response = await fetch(`/api/ledger-entries?id=${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete ledger entry')
      }

      toast.success('Ledger entry deleted successfully')
      fetchData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete ledger entry'
      toast.error(errorMessage)
    }
  }

  const deleteSubgroup = async (subgroupId: string) => {
    if (!permissions.canDelete) {
      toast.error('You do not have permission to delete subgroups')
      return
    }

    if (!confirm('Are you sure you want to delete this subgroup? This will also delete all associated bills.')) return

    try {
      const response = await fetch(`/api/ledger-subgroups?id=${subgroupId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete subgroup')
      }

      toast.success('Subgroup deleted successfully')
      fetchData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete subgroup'
      toast.error(errorMessage)
    }
  }

  const openComprehensiveDialog = (entry?: LedgerEntry) => {
    setEditingEntry(entry || null)
    setIsComprehensiveDialogOpen(true)
  }

  const toggleEntryExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-muted text-muted-foreground border-border', icon: FileText },
      active: { color: 'bg-primary/15 text-primary border-primary/30', icon: Clock },
      completed: { color: 'bg-income/15 text-income border-income/30', icon: CheckCircle },
      archived: { color: 'bg-muted text-muted-foreground border-border', icon: FileText }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: 'bg-income/15 text-income border-income/30',
      medium: 'bg-pending/15 text-pending border-pending/30',
      high: 'bg-pending/15 text-pending border-pending/30',
      urgent: 'bg-destructive/15 text-destructive border-destructive/30'
    }
    return (
      <Badge className={`${priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium} border`}>
        {priority}
      </Badge>
    )
  }

  // Calculate statistics
  const totalEntries = ledgerEntries.length
  const activeEntries = ledgerEntries.filter(entry => entry.status === 'active').length
  const completedEntries = ledgerEntries.filter(entry => entry.status === 'completed').length
  const totalSubgroups = ledgerEntries.reduce((sum, entry) => sum + (entry.ledger_subgroups?.length || 0), 0)
  const totalBills = ledgerEntries.reduce((sum, entry) => {
    const entryBills = entry.bills?.length || 0
    const subgroupBills = entry.ledger_subgroups?.reduce((subSum, subgroup) => subSum + (subgroup.bills?.length || 0), 0) || 0
    return sum + entryBills + subgroupBills
  }, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Ledger Entries
            </h1>
            <p className="text-muted-foreground mt-2">Manage hierarchical bill grouping and organization</p>
          </div>
          <div className="flex gap-2">
            {permissions.canEdit && (
              <Button
                onClick={() => openComprehensiveDialog()}
                className="hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Ledger Entry
              </Button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:bg-accent/50 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.1s'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold text-foreground">{totalEntries}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/15">
                  <FolderOpen className="w-8 h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent/50 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.2s'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-primary">{activeEntries}</p>
                </div>
                <div className="p-2 rounded-full bg-primary/15">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent/50 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.3s'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-income">{completedEntries}</p>
                </div>
                <div className="p-2 rounded-full bg-income/15">
                  <CheckCircle className="w-8 h-8 text-income" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent/50 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.4s'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subgroups</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalSubgroups}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500/15">
                  <Users className="w-8 h-8 text-purple-700 dark:text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent/50 hover:scale-105 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: '0.5s'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
                  <p className="text-2xl font-bold text-pending">{totalBills}</p>
                </div>
                <div className="p-2 rounded-full bg-pending/15">
                  <FileText className="w-8 h-8 text-pending" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ledger Entries List */}
        <div className="space-y-4">
          {ledgerEntries.length === 0 ? (
            <Card className="hover:bg-accent/50 transition-all duration-300">
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No ledger entries found</h3>
                <p className="text-muted-foreground mb-6">Create your first ledger entry to start organizing bills</p>
                {permissions.canEdit && (
                  <Button onClick={() => openComprehensiveDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ledger Entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            ledgerEntries.map((entry, index) => {
              const isExpanded = expandedEntries.has(entry.id)
              const subgroups = entry.ledger_subgroups || []
              const directBills = entry.bills || []
              
              return (
                <Card key={entry.id} className="hover:bg-accent/50 transition-all duration-300 animate-fade-in animate-slide-in-from-bottom-4" style={{animationDelay: `${0.1 * index}s`}}>
                  <CardContent className="p-6">
                    {/* Entry Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEntryExpansion(entry.id)}
                          aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                          className="p-1 h-auto"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{entry.title}</h3>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground">{entry.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(entry.status || 'draft')}
                        {getPriorityBadge(entry.priority || 'medium')}
                        {permissions.canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label="Entry actions">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openComprehensiveDialog(entry)}>
                                Edit Entry
                              </DropdownMenuItem>
                              {permissions.canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => deleteEntry(entry.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  Delete Entry
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Entry Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-muted-foreground">
                      {entry.default_due_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Due: {formatDate(entry.default_due_date)}</span>
                        </div>
                      )}
                      {entry.total_amount && (
                        <div className="flex items-center gap-2">
                          <span>Estimated: {formatCurrency(entry.total_amount)}</span>
                        </div>
                      )}
                      {entry.responsible_parties && entry.responsible_parties.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{entry.responsible_parties.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-border pt-4 space-y-4">
                        {/* Direct Bills */}
                        {directBills.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Direct Bills ({directBills.length})</h4>
                            <div className="space-y-2">
                              {directBills.map((bill) => (
                                <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
                                  <div>
                                    <p className="font-medium text-foreground">{bill.vendor_name}</p>
                                    <p className="text-sm text-muted-foreground">{bill.category}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-foreground">{formatCurrency(bill.amount)}</p>
                                    <p className="text-sm text-muted-foreground">Due: {formatDate(bill.due_date)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subgroups */}
                        {subgroups.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-foreground">Subgroups ({subgroups.length})</h4>
                              {permissions.canEdit && (
                                <Button
                                  size="sm"
                                  onClick={() => openComprehensiveDialog(entry)}
                                  className="hover:scale-105 transition-all duration-300"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Subgroup
                                </Button>
                              )}
                            </div>
                            <div className="space-y-3">
                              {subgroups.map((subgroup) => {
                                const subgroupBills = subgroup.bills || []
                                return (
                                  <div key={subgroup.id} className="border border-border rounded-lg p-4 bg-muted/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <h5 className="font-medium text-foreground">{subgroup.title}</h5>
                                        {subgroup.description && (
                                          <p className="text-sm text-muted-foreground">{subgroup.description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getStatusBadge(subgroup.status || 'draft')}
                                        {getPriorityBadge(subgroup.priority || 'medium')}
                                        {permissions.canEdit && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" aria-label="Subgroup actions">
                                                <MoreHorizontal className="w-4 h-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => openComprehensiveDialog(entry)}>
                                                Edit Subgroup
                                              </DropdownMenuItem>
                                              {permissions.canDelete && (
                                                <DropdownMenuItem 
                                                  onClick={() => deleteSubgroup(subgroup.id)}
                                                  className="text-destructive focus:text-destructive"
                                                >
                                                  Delete Subgroup
                                                </DropdownMenuItem>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Subgroup Bills */}
                                    {subgroupBills.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-sm font-medium text-muted-foreground mb-2">Bills ({subgroupBills.length})</p>
                                        <div className="space-y-2">
                                          {subgroupBills.map((bill) => (
                                            <div key={bill.id} className="flex items-center justify-between p-2 bg-muted/50 border border-border rounded">
                                              <div>
                                                <p className="text-sm font-medium text-foreground">{bill.vendor_name}</p>
                                                <p className="text-xs text-muted-foreground">{bill.category}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-medium text-foreground">{formatCurrency(bill.amount)}</p>
                                                <p className="text-xs text-muted-foreground">Due: {formatDate(bill.due_date)}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add Subgroup Button */}
                        {subgroups.length === 0 && permissions.canEdit && (
                          <div className="text-center py-4">
                            <Button
                              onClick={() => openComprehensiveDialog(entry)}
                              className="hover:scale-105 transition-all duration-300"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Subgroup
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Comprehensive Ledger Dialog */}
        <ComprehensiveLedgerDialog
          open={isComprehensiveDialogOpen}
          onOpenChange={setIsComprehensiveDialogOpen}
          editingEntry={editingEntry}
          onSave={fetchData}
        />
      </div>
    </div>
  )
}