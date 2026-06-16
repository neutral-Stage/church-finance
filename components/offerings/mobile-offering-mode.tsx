'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { formatCurrency, formatDateForInput } from '@/lib/utils'
import { Gift, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DRAFT_KEY_PREFIX = 'cf-offering-draft-'

const OFFERING_TYPES = [
  'Tithe',
  "Lord's Day",
  'Other Offering',
  'Special Offering',
  'Mission Fund Offering',
  'Building Fund Offering',
] as const

export interface OfferingDraft {
  service_date: string
  type: string
  amount: string
  selected_member: string
  notes: string
  saved_at: string
}

interface MobileOfferingModeProps {
  churchId: string
  onClose: () => void
  onSubmit: (data: {
    service_date: string
    type: string
    amount: number
    selected_member: string
    notes: string
  }) => Promise<void>
}

function draftKey(churchId: string) {
  return `${DRAFT_KEY_PREFIX}${churchId}`
}

export function MobileOfferingMode({ churchId, onClose, onSubmit }: MobileOfferingModeProps) {
  const [form, setForm] = useState<OfferingDraft>({
    service_date: formatDateForInput(new Date()),
    type: 'Tithe',
    amount: '',
    selected_member: '',
    notes: '',
    saved_at: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadDraft = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(draftKey(churchId))
      if (!raw) return
      const parsed = JSON.parse(raw) as OfferingDraft
      setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore corrupt draft
    }
  }, [churchId])

  useEffect(() => {
    loadDraft()
  }, [loadDraft])

  const saveDraft = () => {
    try {
      const draft: OfferingDraft = {
        ...form,
        saved_at: new Date().toISOString(),
      }
      window.localStorage.setItem(draftKey(churchId), JSON.stringify(draft))
      toast.success('Draft saved locally')
    } catch {
      toast.error('Could not save draft')
    }
  }

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(draftKey(churchId))
      setForm({
        service_date: formatDateForInput(new Date()),
        type: 'Tithe',
        amount: '',
        selected_member: '',
        notes: '',
        saved_at: '',
      })
      toast.success('Draft cleared')
    } catch {
      toast.error('Could not clear draft')
    }
  }

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount)
    if (!form.type) {
      toast.error('Select an offering type')
      return
    }
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!form.selected_member || form.selected_member === 'none') {
      toast.error('Select a member')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        service_date: form.service_date,
        type: form.type,
        amount,
        selected_member: form.selected_member,
        notes: form.notes,
      })
      clearDraft()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record offering')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sunday Offering</h2>
            <p className="text-xs text-muted-foreground">Quick entry mode</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Sunday mode">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-lg mx-auto w-full">
        {form.saved_at && (
          <p className="text-xs text-muted-foreground text-center">
            Draft saved {new Date(form.saved_at).toLocaleString()}
          </p>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Offering type</Label>
          <div className="grid grid-cols-2 gap-2">
            {OFFERING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type }))}
                className={cn(
                  'min-h-[56px] px-3 py-3 rounded-xl border text-sm font-medium transition-colors',
                  form.type === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-amount" className="text-sm font-medium">
            Amount
          </Label>
          <Input
            id="mobile-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="h-16 text-2xl text-center font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Member</Label>
          <MemberCombobox
            value={form.selected_member}
            onValueChange={(memberId) =>
              setForm((prev) => ({ ...prev, selected_member: memberId }))
            }
            placeholder="Search member..."
            className="min-h-[52px] text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-date" className="text-sm font-medium">
            Service date
          </Label>
          <Input
            id="mobile-date"
            type="date"
            value={form.service_date}
            onChange={(e) => setForm((prev) => ({ ...prev, service_date: e.target.value }))}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-notes" className="text-sm font-medium">
            Notes (optional)
          </Label>
          <Input
            id="mobile-notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional note..."
            className="h-12 text-base"
          />
        </div>
      </div>

      <footer className="p-4 border-t border-border bg-card space-y-3 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[48px] gap-2"
            onClick={saveDraft}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] gap-2"
            onClick={clearDraft}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          className="w-full min-h-[56px] text-lg font-semibold"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? 'Recording...' : `Record ${form.amount ? formatCurrency(parseFloat(form.amount) || 0) : 'Offering'}`}
        </Button>
      </footer>
    </div>
  )
}
