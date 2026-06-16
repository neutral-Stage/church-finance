'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Bill, BillFormValues, Fund, LedgerEntry, LedgerSubgroup } from './types'

interface BillFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBill: Bill | null
  billForm: BillFormValues
  onBillFormChange: (form: BillFormValues) => void
  funds: Fund[]
  ledgerEntries: LedgerEntry[]
  ledgerSubgroups: LedgerSubgroup[]
  onSubmit: (e: React.FormEvent) => void
  trigger?: React.ReactNode
}

export function BillFormDialog({
  open,
  onOpenChange,
  editingBill,
  billForm,
  onBillFormChange,
  funds,
  ledgerEntries,
  ledgerSubgroups,
  onSubmit,
  trigger,
}: BillFormDialogProps) {
  const setField = <K extends keyof BillFormValues>(key: K, value: BillFormValues[K]) => {
    onBillFormChange({ ...billForm, [key]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editingBill ? 'Edit Bill' : 'Add New Bill'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingBill ? 'Update bill information' : 'Create a new bill or recurring payment'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor *</Label>
              <Input
                id="vendor_name"
                value={billForm.vendor_name}
                onChange={(e) => setField('vendor_name', e.target.value)}
                placeholder="Vendor name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={billForm.amount}
                onChange={(e) => setField('amount', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={billForm.due_date}
                onChange={(e) => setField('due_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund_id">Fund *</Label>
              <Select value={billForm.fund_id} onValueChange={(value) => setField('fund_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={billForm.category}
                onChange={(e) => setField('category', e.target.value)}
                placeholder="e.g., Utilities, Maintenance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={billForm.status}
                onValueChange={(value: BillFormValues['status']) => setField('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={billForm.frequency}
              onValueChange={(value: BillFormValues['frequency']) => setField('frequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ledger_entry">Ledger Entry</Label>
              <Select
                value={billForm.ledger_entry_id || 'none'}
                onValueChange={(value) =>
                  onBillFormChange({
                    ...billForm,
                    ledger_entry_id: value === 'none' ? '' : value,
                    ledger_subgroup_id:
                      value === 'none' || !value ? '' : billForm.ledger_subgroup_id,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ledger entry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ledgerEntries.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger_subgroup">Subgroup</Label>
              <Select
                value={billForm.ledger_subgroup_id || 'none'}
                onValueChange={(value) =>
                  setField('ledger_subgroup_id', value === 'none' ? '' : value)
                }
                disabled={!billForm.ledger_entry_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subgroup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ledgerSubgroups
                    .filter((subgroup) => subgroup.ledger_entry_id === billForm.ledger_entry_id)
                    .map((subgroup) => (
                      <SelectItem key={subgroup.id} value={subgroup.id}>
                        {subgroup.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={billForm.priority}
                onValueChange={(value: BillFormValues['priority']) => setField('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval_status">Approval Status</Label>
              <Select
                value={billForm.approval_status}
                onValueChange={(value: BillFormValues['approval_status']) =>
                  setField('approval_status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approval status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible_parties">Responsible Parties</Label>
              <Input
                id="responsible_parties"
                value={billForm.responsible_parties}
                onChange={(e) => setField('responsible_parties', e.target.value)}
                placeholder="Enter names separated by commas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocation_percentage">Allocation %</Label>
              <Input
                id="allocation_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={billForm.allocation_percentage}
                onChange={(e) => setField('allocation_percentage', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={billForm.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingBill ? 'Update Bill' : 'Create Bill'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
