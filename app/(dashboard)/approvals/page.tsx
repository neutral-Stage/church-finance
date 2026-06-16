'use client'

import { useCallback, useEffect, useState } from 'react'
import { useChurch } from '@/contexts/ChurchContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { AdminErrorState } from '@/components/admin/AdminErrorState'
import { AdminLoadingState } from '@/components/admin/AdminLoadingState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Building2, CheckCircle, ClipboardCheck, FileText, Receipt, CreditCard, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ApprovalEntityType, ApprovalItem } from '@/app/api/approvals/route'

const ENTITY_LABELS: Record<ApprovalEntityType, string> = {
  bill: 'Bill',
  ledger_entry: 'Ledger Entry',
  advance: 'Advance',
}

const ENTITY_ICONS: Record<ApprovalEntityType, typeof Receipt> = {
  bill: Receipt,
  ledger_entry: FileText,
  advance: CreditCard,
}

export default function ApprovalsPage() {
  const { selectedChurch } = useChurch()
  const { hasRole } = useAuth()
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)
  const [reviewItem, setReviewItem] = useState<ApprovalItem | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const canReview = hasRole('treasurer') || hasRole('admin')

  const loadApprovals = useCallback(async () => {
    if (!selectedChurch?.id) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/approvals?church_id=${selectedChurch.id}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load approvals')
      }

      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [selectedChurch?.id])

  useEffect(() => {
    void loadApprovals()
  }, [loadApprovals])

  const openReview = (item: ApprovalItem, action: 'approve' | 'reject') => {
    setReviewItem(item)
    setReviewAction(action)
    setReviewNotes('')
  }

  const closeReview = () => {
    setReviewItem(null)
    setReviewAction(null)
    setReviewNotes('')
  }

  const submitReview = async () => {
    if (!reviewItem || !reviewAction || !selectedChurch?.id) return

    setActing(true)
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          entity_type: reviewItem.entity_type,
          id: reviewItem.id,
          church_id: selectedChurch.id,
          notes: reviewNotes || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to process approval')
      }

      toast.success(
        reviewAction === 'approve'
          ? `${ENTITY_LABELS[reviewItem.entity_type]} approved`
          : `${ENTITY_LABELS[reviewItem.entity_type]} rejected`
      )
      closeReview()
      await loadApprovals()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process approval')
    } finally {
      setActing(false)
    }
  }

  if (!selectedChurch) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <GlassCard className="max-w-md w-full">
          <GlassCardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No church selected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a church to view pending approvals.
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  if (loading) {
    return <AdminLoadingState title="Loading approval inbox..." />
  }

  if (error) {
    return <AdminErrorState error={error} onRetry={() => void loadApprovals()} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Approval Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Review pending bills, ledger entries, and advances for {selectedChurch.name}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {items.length} pending
        </Badge>
      </div>

      {items.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardCheck}
          title="All caught up"
          description="There are no items waiting for approval right now."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const Icon = ENTITY_ICONS[item.entity_type]
            return (
              <GlassCard key={`${item.entity_type}-${item.id}`} hover>
                <GlassCardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <GlassCardTitle className="text-base truncate">{item.title}</GlassCardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{ENTITY_LABELS[item.entity_type]}</Badge>
                          {item.submitted_at && (
                            <span className="text-xs text-muted-foreground">
                              Submitted {formatDate(item.submitted_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.amount != null && (
                      <span className="font-semibold text-foreground shrink-0">
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.entity_type === 'bill' && item.metadata?.due_date != null && (
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(String(item.metadata.due_date))}
                    </p>
                  )}
                  {canReview && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => openReview(item, 'approve')}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReview(item, 'reject')}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            )
          })}
        </div>
      )}

      {!canReview && items.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Treasurer or admin access is required to approve or reject items.
        </p>
      )}

      <Dialog open={!!reviewItem} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'}{' '}
              {reviewItem ? ENTITY_LABELS[reviewItem.entity_type] : 'item'}
            </DialogTitle>
            <DialogDescription>
              {reviewItem?.title}
              {reviewItem?.amount != null && ` — ${formatCurrency(reviewItem.amount)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-notes">Notes (optional)</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add a note for the audit trail..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReview} disabled={acting}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              onClick={() => void submitReview()}
              disabled={acting}
            >
              {acting ? 'Processing...' : reviewAction === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
