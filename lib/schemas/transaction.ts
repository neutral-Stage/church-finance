import { z } from 'zod'

export const TRANSACTION_CATEGORIES = {
  income: [
    'Tithes',
    'Offerings',
    'Donations',
    'Fundraising',
    'Investment Income',
    'Rental Income',
    'Other Income',
  ],
  expense: [
    'Utilities',
    'Maintenance',
    'Supplies',
    'Equipment',
    'Ministry Expenses',
    'Staff Expenses',
    'Insurance',
    'Professional Services',
    'Other Expenses',
  ],
} as const

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  fund_id: z.string().min(1, 'Fund is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const parsed = parseFloat(val)
      return !Number.isNaN(parsed) && parsed > 0
    }, 'Amount must be greater than zero'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  payment_method: z.enum(['cash', 'bank']),
  transaction_date: z.string().min(1, 'Date is required'),
  receipt_number: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

export const transactionDefaultValues: TransactionFormValues = {
  type: 'income',
  fund_id: '',
  amount: '',
  description: '',
  category: '',
  payment_method: 'cash',
  transaction_date: new Date().toISOString().split('T')[0],
  receipt_number: '',
}

export function toTransactionPayload(values: TransactionFormValues, churchId?: string) {
  return {
    type: values.type,
    fund_id: values.fund_id,
    amount: parseFloat(values.amount),
    description: values.description,
    category: values.category,
    payment_method: values.payment_method,
    transaction_date: values.transaction_date,
    receipt_number: values.receipt_number || null,
    church_id: churchId ?? null,
  }
}
