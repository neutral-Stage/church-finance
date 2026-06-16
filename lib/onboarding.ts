import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { safeInsert, safeSelect } from '@/lib/supabase-helpers'

export const DEFAULT_FUND_TEMPLATES = [
  {
    name: 'General',
    fund_type: 'general',
    description: 'General operating fund for day-to-day church expenses',
  },
  {
    name: 'Building',
    fund_type: 'building',
    description: 'Building and facilities maintenance fund',
  },
  {
    name: 'Missions',
    fund_type: 'missions',
    description: 'Missions and outreach fund',
  },
] as const

export type DefaultFundTemplate = (typeof DEFAULT_FUND_TEMPLATES)[number]

export type CreateChurchInput = {
  name: string
  type?: string
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  organizationName?: string | null
}

export type CreateChurchResult = {
  church: Database['public']['Tables']['churches']['Row']
  funds: Database['public']['Tables']['funds']['Row'][]
  organization: Database['public']['Tables']['organizations']['Row'] | null
}

const FREE_PLAN_ID = 'free'

export async function createChurchWithDefaults(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateChurchInput
): Promise<{ data: CreateChurchResult | null; error: string | null }> {
  let organizationId: string | null = null
  let organization: Database['public']['Tables']['organizations']['Row'] | null = null

  if (input.organizationName?.trim()) {
    const { data: orgRows, error: orgError } = await safeInsert(supabase, 'organizations', {
      name: input.organizationName.trim(),
      created_by: userId,
    })

    if (orgError) {
      return { data: null, error: 'Failed to create organization' }
    }

    organization = orgRows?.[0] ?? null
    organizationId = organization?.id ?? null
  }

  const { data: churches, error: churchError } = await safeInsert(supabase, 'churches', {
    name: input.name.trim(),
    type: input.type ?? 'church',
    description: input.description ?? null,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    website: input.website ?? null,
    organization_id: organizationId,
    plan_id: FREE_PLAN_ID,
    onboarding_completed_at: null,
    created_by: userId,
    is_active: true,
  })

  const church = churches?.[0]
  if (churchError || !church) {
    return { data: null, error: 'Failed to create church' }
  }

  const fundInserts = DEFAULT_FUND_TEMPLATES.map((template) => ({
    church_id: church.id,
    name: template.name,
    fund_type: template.fund_type,
    description: template.description,
    current_balance: 0,
    is_active: true,
    created_by: userId,
  }))

  const { data: funds, error: fundsError } = await safeInsert(supabase, 'funds', fundInserts)
  if (fundsError) {
    return { data: null, error: 'Failed to create default funds' }
  }

  const { data: adminRoles, error: roleLookupError } = await safeSelect(supabase, 'roles', {
    filter: { column: 'name', value: 'church_admin' },
  })

  if (roleLookupError) {
    return { data: null, error: 'Failed to look up church admin role' }
  }

  const adminRole = adminRoles?.[0]
  if (!adminRole) {
    return { data: null, error: 'Church admin role not found' }
  }

  const { error: roleAssignError } = await safeInsert(supabase, 'user_church_roles', {
    user_id: userId,
    church_id: church.id,
    role_id: adminRole.id,
    granted_by: userId,
    is_active: true,
    notes: 'Church creator - onboarding setup',
  })

  if (roleAssignError) {
    return { data: null, error: 'Failed to assign church admin role' }
  }

  return {
    data: {
      church,
      funds: funds ?? [],
      organization,
    },
    error: null,
  }
}
