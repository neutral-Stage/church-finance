'use client'

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Bill, GroupedBills, LedgerSubgroup } from './types'

interface BillsListProps {
  bills: Bill[]
  groupedBills: GroupedBills
  expandedEntries: Set<string>
  expandedSubgroups: Set<string>
  onToggleEntry: (entryId: string) => void
  onToggleSubgroup: (subgroupId: string) => void
  isOverdue: (dueDate: string) => boolean
  canManage: boolean
  onEditBill: (bill: Bill) => void
  onUpdateBillStatus: (billId: string, status: 'pending' | 'paid' | 'overdue') => void
  onDeleteBill: (billId: string) => void
}

function BillRow({
  bill,
  overdue,
  canManage,
  variant = 'primary',
  onEditBill,
  onUpdateBillStatus,
  onDeleteBill,
}: {
  bill: Bill
  overdue: boolean
  canManage: boolean
  variant?: 'primary' | 'purple'
  onEditBill: (bill: Bill) => void
  onUpdateBillStatus: (billId: string, status: 'pending' | 'paid' | 'overdue') => void
  onDeleteBill: (billId: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 transition-all duration-300 hover:bg-muted/50">
      <div className="flex items-center gap-4">
        <div
          className={`h-2 w-2 rounded-full ${variant === 'purple' ? 'bg-purple-500' : 'bg-primary'}`}
        />
        <div>
          <p className="font-semibold text-foreground">{bill.vendor_name}</p>
          <p className="text-sm text-muted-foreground">{bill.category || 'No category'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-foreground">{formatCurrency(bill.amount)}</p>
          <p className={`text-sm ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatDate(bill.due_date)}
            {overdue && <AlertTriangle className="ml-1 inline h-3 w-3" />}
          </p>
        </div>
        <Badge
          variant={bill.status === 'paid' ? 'success' : overdue ? 'destructive' : 'warning'}
          className={`${
            bill.status === 'paid'
              ? 'border-income/30 bg-income/15 text-income'
              : overdue
                ? 'border-destructive/30 bg-destructive/15 text-destructive'
                : 'border-pending/30 bg-pending/15 text-pending'
          }`}
        >
          {overdue && bill.status === 'pending' ? 'overdue' : bill.status}
        </Badge>
        {canManage && (
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
              <DropdownMenuItem onClick={() => onEditBill(bill)}>Edit</DropdownMenuItem>
              {bill.status !== 'paid' && (
                <DropdownMenuItem onClick={() => onUpdateBillStatus(bill.id, 'paid')}>
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {bill.status === 'paid' && (
                <DropdownMenuItem onClick={() => onUpdateBillStatus(bill.id, 'pending')}>
                  Mark as Pending
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteBill(bill.id)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function BillsList({
  bills,
  groupedBills,
  expandedEntries,
  expandedSubgroups,
  onToggleEntry,
  onToggleSubgroup,
  isOverdue,
  canManage,
  onEditBill,
  onUpdateBillStatus,
  onDeleteBill,
}: BillsListProps) {
  return (
    <GlassCard
      variant="default"
      className="animate-in fade-in-0 slide-in-from-bottom-4 shadow-lg transition-all duration-500"
      style={{ animationDelay: '600ms' }}
    >
      <GlassCardHeader className="pb-6">
        <GlassCardTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <FileText className="h-6 w-6" />
          Ledger Entries & Bills
        </GlassCardTitle>
        <GlassCardDescription className="text-base font-medium text-muted-foreground">
          Manage bills organized by ledger entries and subgroups
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="pt-0">
        <div className="space-y-4">
          {Object.entries(groupedBills).map(([entryId, entryData]) => {
            const isExpanded = expandedEntries.has(entryId)
            const entry = entryData?.entry
            const directBills = entryData?.directBills || []
            const subgroups = entryData?.subgroups || {}

            return (
              <div key={entryId} className="rounded-xl border border-border bg-muted/30 shadow-lg">
                <div
                  className="flex cursor-pointer items-center justify-between p-4 transition-all duration-300 hover:bg-muted/50"
                  onClick={() => onToggleEntry(entryId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    {entry ? (
                      <FolderOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <Folder className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {entry ? entry.title : 'Ungrouped Bills'}
                      </h3>
                      {entry?.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {directBills.length +
                        Object.values(subgroups).reduce(
                          (sum, sg) => sum + (sg?.bills?.length || 0),
                          0
                        )}{' '}
                      bills
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(
                        directBills.reduce((sum, bill) => sum + bill.amount, 0) +
                          Object.values(subgroups).reduce(
                            (sum, sg) =>
                              sum +
                              (sg?.bills || []).reduce(
                                (billSum, bill) => billSum + bill.amount,
                                0
                              ),
                            0
                          )
                      )}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border">
                    {directBills.length > 0 && (
                      <div className="space-y-2 p-4">
                        {directBills.map((bill) => (
                          <BillRow
                            key={bill.id}
                            bill={bill}
                            overdue={bill.status !== 'paid' && isOverdue(bill.due_date)}
                            canManage={canManage}
                            onEditBill={onEditBill}
                            onUpdateBillStatus={onUpdateBillStatus}
                            onDeleteBill={onDeleteBill}
                          />
                        ))}
                      </div>
                    )}

                    {Object.entries(subgroups).map(
                      ([subgroupId, subgroupData]: [
                        string,
                        { subgroup: LedgerSubgroup; bills: Bill[] },
                      ]) => {
                        const isSubgroupExpanded = expandedSubgroups.has(subgroupId)
                        const subgroup = subgroupData?.subgroup
                        const subgroupBills = subgroupData?.bills || []
                        if (!subgroup) return null

                        return (
                          <div key={subgroupId} className="border-t border-border">
                            <div
                              className="flex cursor-pointer items-center justify-between p-4 pl-8 transition-all duration-300 hover:bg-muted/30"
                              onClick={() => onToggleSubgroup(subgroupId)}
                            >
                              <div className="flex items-center gap-3">
                                {isSubgroupExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Folder className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                                <div>
                                  <h4 className="font-semibold text-foreground">{subgroup.title}</h4>
                                  {subgroup.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {subgroup.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {subgroupBills.length} bills
                                </span>
                                <span className="font-bold text-foreground">
                                  {formatCurrency(
                                    subgroupBills.reduce((sum, bill) => sum + bill.amount, 0)
                                  )}
                                </span>
                              </div>
                            </div>

                            {isSubgroupExpanded && subgroupBills.length > 0 && (
                              <div className="space-y-2 pb-4 pl-12 pr-4">
                                {subgroupBills.map((bill) => (
                                  <BillRow
                                    key={bill.id}
                                    bill={bill}
                                    overdue={bill.status !== 'paid' && isOverdue(bill.due_date)}
                                    canManage={canManage}
                                    variant="purple"
                                    onEditBill={onEditBill}
                                    onUpdateBillStatus={onUpdateBillStatus}
                                    onDeleteBill={onDeleteBill}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {bills.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">No bills found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first bill to get started
              </p>
            </div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
