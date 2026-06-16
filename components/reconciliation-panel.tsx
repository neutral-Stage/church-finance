'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Fund } from '@/types/database'
import { GitCompare, Loader2, SkipForward, Link2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface ReconciliationSuggestion {
  id: string
  amount: number
  description: string
  transaction_date: string
  type: string
  score?: number
  matchReasons?: string[]
}

interface StagingItem {
  id: string
  parsed_amount: number | null
  parsed_date: string | null
  parsed_description: string | null
  status: string
  suggestions: ReconciliationSuggestion[]
}

interface ReconciliationPanelProps {
  churchId: string
  funds: Fund[]
  onReconciled?: () => void
}

export function ReconciliationPanel({ churchId, funds, onReconciled }: ReconciliationPanelProps) {
  const [items, setItems] = useState<StagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [selectedFunds, setSelectedFunds] = useState<Record<string, string>>({})

  const loadReconciliation = useCallback(async () => {
    if (!churchId) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/import/reconciliation?church_id=${churchId}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load reconciliation data')
      }
      setItems(data.unmatched ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation data')
    } finally {
      setLoading(false)
    }
  }, [churchId])

  useEffect(() => {
    loadReconciliation()
  }, [loadReconciliation])

  const runAction = async (
    stagingId: string,
    action: 'match' | 'import' | 'skip',
    extra?: { transaction_id?: string; fund_id?: string }
  ) => {
    setActionId(stagingId)
    try {
      const response = await fetch('/api/import/reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          staging_id: stagingId,
          church_id: churchId,
          action,
          ...extra,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Action failed')
      }
      toast.success(`Row ${action === 'skip' ? 'skipped' : action === 'match' ? 'matched' : 'imported'}`)
      await loadReconciliation()
      onReconciled?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading reconciliation...
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          <GitCompare className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-foreground">No pending imports</p>
          <p className="text-sm mt-1">Import a bank statement CSV to start reconciliation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Bank Reconciliation</CardTitle>
        <CardDescription>
          Match imported bank rows to existing ledger transactions or create new entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Import</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Suggested matches</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-foreground">
                  {item.parsed_description ?? '—'}
                </TableCell>
                <TableCell>
                  {item.parsed_amount !== null ? formatCurrency(item.parsed_amount) : '—'}
                </TableCell>
                <TableCell>
                  {item.parsed_date ? formatDate(item.parsed_date) : '—'}
                </TableCell>
                <TableCell>
                  {item.suggestions.length === 0 ? (
                    <Badge variant="outline">No matches</Badge>
                  ) : (
                    <div className="space-y-1">
                      {item.suggestions.map((s) => (
                        <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>
                            {formatDate(s.transaction_date)} · {formatCurrency(s.amount)} ·{' '}
                            {s.description}
                          </span>
                          {typeof s.score === 'number' && (
                            <Badge variant="secondary" className="text-[10px]">
                              {Math.round(s.score * 100)}% match
                            </Badge>
                          )}
                          {s.matchReasons && s.matchReasons.length > 0 && (
                            <span className="text-[10px] opacity-75">
                              ({s.matchReasons.join(', ')})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col sm:flex-row gap-2 justify-end items-end">
                    {item.suggestions[0] && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionId === item.id}
                        onClick={() =>
                          runAction(item.id, 'match', { transaction_id: item.suggestions[0].id })
                        }
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Match
                      </Button>
                    )}
                    <div className="flex gap-2 items-center">
                      <Select
                        value={selectedFunds[item.id] ?? funds[0]?.id ?? ''}
                        onValueChange={(value) =>
                          setSelectedFunds((prev) => ({ ...prev, [item.id]: value }))
                        }
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue placeholder="Fund" />
                        </SelectTrigger>
                        <SelectContent>
                          {funds.map((fund) => (
                            <SelectItem key={fund.id} value={fund.id}>
                              {fund.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={actionId === item.id || funds.length === 0}
                        onClick={() =>
                          runAction(item.id, 'import', {
                            fund_id: selectedFunds[item.id] ?? funds[0]?.id,
                          })
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Import
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionId === item.id}
                      onClick={() => runAction(item.id, 'skip')}
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
