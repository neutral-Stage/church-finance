import { z } from 'zod'

export const memberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  phone: z.string().optional(),
  fellowship_name: z.string().optional(),
  job: z.string().optional(),
  location: z.string().optional(),
})

export type MemberFormValues = z.infer<typeof memberSchema>

export const memberDefaultValues: MemberFormValues = {
  name: '',
  phone: '',
  fellowship_name: '',
  job: '',
  location: '',
}

export function toMemberPayload(values: MemberFormValues, churchId?: string) {
  return {
    name: values.name.trim(),
    phone: values.phone?.trim() || null,
    fellowship_name: values.fellowship_name?.trim() || null,
    job: values.job?.trim() || null,
    location: values.location?.trim() || null,
    ...(churchId ? { church_id: churchId } : {}),
  }
}
