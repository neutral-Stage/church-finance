'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Fund } from '@/types/database'
import {
  TRANSACTION_CATEGORIES,
  transactionDefaultValues,
  transactionSchema,
  type TransactionFormValues,
} from '@/lib/schemas/transaction'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
  funds: Fund[]
  defaultValues?: Partial<TransactionFormValues>
  onSubmit: (values: TransactionFormValues) => void | Promise<void>
  onCancel?: () => void
  submitting?: boolean
  submitLabel?: string
  className?: string
}

export function TransactionForm({
  funds,
  defaultValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Save Transaction',
  className,
}: TransactionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      ...transactionDefaultValues,
      fund_id: funds[0]?.id ?? '',
      ...defaultValues,
    },
  })

  const transactionType = watch('type')

  useEffect(() => {
    reset({
      ...transactionDefaultValues,
      fund_id: funds[0]?.id ?? '',
      ...defaultValues,
    })
  }, [defaultValues, funds, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value: 'income' | 'expense') => {
                  field.onChange(value)
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fund_id">Fund</Label>
          <Controller
            name="fund_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="fund_id">
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
            )}
          />
          {errors.fund_id && <p className="text-sm text-destructive">{errors.fund_id.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('amount')}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES[transactionType].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Transaction description" {...register('description')} />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment Method</Label>
        <Controller
          name="payment_method"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.payment_method && (
          <p className="text-sm text-destructive">{errors.payment_method.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transaction_date">Date</Label>
          <Input id="transaction_date" type="date" {...register('transaction_date')} />
          {errors.transaction_date && (
            <p className="text-sm text-destructive">{errors.transaction_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt_number">Receipt Number</Label>
          <Input id="receipt_number" placeholder="Optional" {...register('receipt_number')} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
