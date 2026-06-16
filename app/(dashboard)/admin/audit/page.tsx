'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminLoadingState } from '@/components/admin/AdminLoadingState'
import { AdminErrorState } from '@/components/admin/AdminErrorState'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { downloadAuditCsv, downloadAuditPdf } from '@/lib/audit-export'
import { ClipboardList, Download, FileText, Search } from 'lucide-react'

interface AuditEntry {
  id: string
  church_id: string | null
  user_id: string | null
  action: 'create' | 'update' | 'delete'
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

const ENTITY_TYPES = ['transaction', 'offering', 'bill', 'member', 'fund']
const ACTIONS = ['create', 'update', 'delete'] as const

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const loadAuditLog = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ limit: '200' })
      if (entityFilter !== 'all') params.set('entity_type', entityFilter)
      if (actionFilter !== 'all') params.set('action', actionFilter)

      const response = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load audit log')
      }

      setEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [entityFilter, actionFilter])

  useEffect(() => {
    loadAuditLog()
  }, [loadAuditLog])

  const filtered = entries.filter((entry) => {
    if (!searchTerm) return true
    const haystack = [
      entry.entity_type,
      entry.entity_id,
      entry.action,
      JSON.stringify(entry.new_data),
      JSON.stringify(entry.old_data),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(searchTerm.toLowerCase())
  })

  const actionVariant = (action: string) => {
    if (action === 'create') return 'default'
    if (action === 'delete') return 'destructive'
    return 'secondary'
  }

  const exportFilenameBase = `audit-log-${new Date().toISOString().split('T')[0]}`

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <AdminPageHeader
          title="Audit Log"
          description="Review create, update, and delete actions across financial records."
          actions={[
            {
              label: 'Export CSV',
              icon: Download,
              variant: 'outline',
              onClick: () => downloadAuditCsv(filtered, `${exportFilenameBase}.csv`),
            },
            {
              label: 'Export PDF',
              icon: FileText,
              variant: 'outline',
              onClick: () => downloadAuditPdf(filtered, `${exportFilenameBase}.pdf`),
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Entity type</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="bg-background pl-10"
            placeholder="Search audit entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading && (
          <AdminLoadingState title="Loading audit log..." description="Fetching recent activity" />
        )}

        {!loading && error && <AdminErrorState error={error} onRetry={loadAuditLog} />}

        {!loading && !error && filtered.length === 0 && (
          <AdminEmptyState
            icon={ClipboardList}
            title="No audit entries"
            description="Financial changes will appear here once activity is recorded."
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{entry.user_id ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{entry.entity_type}</span>
                      <p className="max-w-[140px] truncate font-mono text-xs text-muted-foreground">
                        {entry.entity_id}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {entry.action === 'delete'
                        ? JSON.stringify(entry.old_data)
                        : JSON.stringify(entry.new_data ?? entry.old_data)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadAuditCsv(filtered)}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadAuditPdf(filtered)}>
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
