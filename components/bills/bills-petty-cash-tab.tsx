'use client'

import { CreditCard, MoreHorizontal } from 'lucide-react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/data-table/data-table'
import type { DataTableColumn } from '@/components/data-table/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PettyCash, PettyCashFormValues } from './types'

interface BillsPettyCashTabProps {
  pettyCash: PettyCash[]
  canManage: boolean
  pettyCashDialogOpen: boolean
  onPettyCashDialogOpenChange: (open: boolean) => void
  editingPettyCash: PettyCash | null
  pettyCashForm: PettyCashFormValues
  onPettyCashFormChange: (form: PettyCashFormValues) => void
  onPettyCashSubmit: (e: React.FormEvent) => void
  onEditPettyCash: (pettyCash: PettyCash) => void
  onDeletePettyCash: (pettyCashId: string) => void
  dialogTrigger?: React.ReactNode
  renderMode?: 'dialog' | 'content' | 'both'
}

export function BillsPettyCashTab({
  pettyCash,
  canManage,
  pettyCashDialogOpen,
  onPettyCashDialogOpenChange,
  editingPettyCash,
  pettyCashForm,
  onPettyCashFormChange,
  onPettyCashSubmit,
  onEditPettyCash,
  onDeletePettyCash,
  dialogTrigger,
  renderMode = 'both',
}: BillsPettyCashTabProps) {
  const setField = <K extends keyof PettyCashFormValues>(key: K, value: PettyCashFormValues[K]) => {
    onPettyCashFormChange({ ...pettyCashForm, [key]: value })
  }

  const columns: DataTableColumn<PettyCash>[] = [
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => formatDate(row.created_at || ''),
    },
    {
      id: 'recipient',
      header: 'Recipient',
      accessorKey: 'approved_by',
      sortable: true,
      cell: (row) => row.approved_by || 'N/A',
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'purpose',
      className: 'max-w-xs truncate',
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      className: 'text-right font-bold',
      cell: (row) => formatCurrency(row.amount),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant="secondary"
          className={`font-semibold shadow-lg ${
            row.receipt_available
              ? 'border-income/30 bg-income/15 text-income'
              : 'border-border bg-muted text-muted-foreground'
          }`}
        >
          {row.receipt_available ? 'Receipt Available' : 'No Receipt'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      hideOnMobile: true,
      cell: (row) =>
        canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditPettyCash(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeletePettyCash(row.id)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ]

  const showDialog = renderMode === 'dialog' || renderMode === 'both'
  const showContent = renderMode === 'content' || renderMode === 'both'

  return (
    <>
      {showDialog && (
      <Dialog open={pettyCashDialogOpen} onOpenChange={onPettyCashDialogOpenChange}>
        {dialogTrigger && <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>}
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPettyCash ? 'Edit Petty Cash' : 'New Petty Cash Request'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingPettyCash
                ? 'Update petty cash information'
                : 'Create a new petty cash request'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onPettyCashSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petty-amount">Amount *</Label>
                <Input
                  id="petty-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={pettyCashForm.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="petty-transaction_date">Transaction Date *</Label>
                <Input
                  id="petty-transaction_date"
                  type="date"
                  value={pettyCashForm.transaction_date}
                  onChange={(e) => setField('transaction_date', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="petty-purpose">Purpose *</Label>
              <Textarea
                id="petty-purpose"
                value={pettyCashForm.purpose}
                onChange={(e) => setField('purpose', e.target.value)}
                placeholder="What is this for?"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petty-approved_by">Approved By</Label>
                <Input
                  id="petty-approved_by"
                  value={pettyCashForm.approved_by}
                  onChange={(e) => setField('approved_by', e.target.value)}
                  placeholder="Approver name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="petty-receipt_available">Receipt Available</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="petty-receipt_available"
                    checked={pettyCashForm.receipt_available}
                    onChange={(e) => setField('receipt_available', e.target.checked)}
                    className="border border-border bg-muted/50"
                  />
                  <Label htmlFor="petty-receipt_available" className="text-foreground">
                    Receipt is available
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onPettyCashDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPettyCash ? 'Update Request' : 'Create Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {showContent && (
      <GlassCard
        variant="default"
        className="animate-in fade-in-0 slide-in-from-bottom-4 shadow-lg transition-all duration-500"
        style={{ animationDelay: '600ms' }}
      >
        <GlassCardHeader className="pb-6">
          <GlassCardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <CreditCard className="h-6 w-6" />
            Petty Cash Management
          </GlassCardTitle>
          <GlassCardDescription className="text-base font-medium text-muted-foreground">
            Manage petty cash requests and approvals
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="pt-0">
          <DataTable
            columns={columns}
            data={pettyCash}
            emptyState={
              <div className="py-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
                  <CreditCard className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                  No petty cash requests found
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first request to get started
                </p>
              </div>
            }
            mobileCardRender={(row) => (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.approved_by || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(row.created_at || '')}</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(row.amount)}</p>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{row.purpose}</p>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={
                      row.receipt_available
                        ? 'border-income/30 bg-income/15 text-income'
                        : 'border-border bg-muted text-muted-foreground'
                    }
                  >
                    {row.receipt_available ? 'Receipt Available' : 'No Receipt'}
                  </Badge>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditPettyCash(row)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeletePettyCash(row.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )}
          />
        </GlassCardContent>
      </GlassCard>
      )}
    </>
  )
}
