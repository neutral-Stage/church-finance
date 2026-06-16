'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { memberDefaultValues, memberSchema, type MemberFormValues } from '@/lib/schemas/member'
import { cn } from '@/lib/utils'

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>
  onSubmit: (values: MemberFormValues) => void | Promise<void>
  onCancel?: () => void
  submitting?: boolean
  submitLabel?: string
  className?: string
}

export function MemberForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'Save Member',
  className,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      ...memberDefaultValues,
      ...defaultValues,
    },
  })

  useEffect(() => {
    reset({
      ...memberDefaultValues,
      ...defaultValues,
    })
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" placeholder="Full name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="Phone number" {...register('phone')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fellowship_name">Fellowship</Label>
          <Input id="fellowship_name" placeholder="Fellowship name" {...register('fellowship_name')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job">Job</Label>
          <Input id="job" placeholder="Occupation" {...register('job')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="City or area" {...register('location')} />
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
