import type { Database } from '@/types/database'

export type Bill = Database['public']['Tables']['bills']['Row'] & {
  ledger_entries?: LedgerEntry | null
  ledger_subgroups?: LedgerSubgroup | null
}

export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']
export type LedgerSubgroup = Database['public']['Tables']['ledger_subgroups']['Row']
export type PettyCash = Database['public']['Tables']['petty_cash']['Row']
export type Fund = Database['public']['Tables']['funds']['Row']

export interface BillFormValues {
  vendor_name: string
  amount: string
  due_date: string
  fund_id: string
  category: string
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
  status: 'pending' | 'paid' | 'overdue'
  ledger_entry_id: string
  ledger_subgroup_id: string
  responsible_parties: string
  allocation_percentage: string
  priority: 'low' | 'medium' | 'high'
  approval_status: 'pending' | 'approved' | 'rejected'
  notes: string
}

export interface PettyCashFormValues {
  amount: string
  purpose: string
  transaction_date: string
  approved_by: string
  receipt_available: boolean
}

export const defaultBillFormValues: BillFormValues = {
  vendor_name: '',
  amount: '',
  due_date: '',
  fund_id: '',
  category: '',
  frequency: 'one-time',
  status: 'pending',
  ledger_entry_id: '',
  ledger_subgroup_id: '',
  responsible_parties: '',
  allocation_percentage: '',
  priority: 'medium',
  approval_status: 'pending',
  notes: '',
}

export const defaultPettyCashFormValues: PettyCashFormValues = {
  amount: '',
  purpose: '',
  transaction_date: new Date().toISOString().split('T')[0],
  approved_by: '',
  receipt_available: false,
}

export type GroupedBills = Record<
  string,
  {
    entry: LedgerEntry | null
    directBills: Bill[]
    subgroups: Record<string, { subgroup: LedgerSubgroup; bills: Bill[] }>
  }
>
