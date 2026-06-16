import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'
import { Database } from '@/types/database'

export type OnboardingStatus = {
  needsOnboarding: boolean
  incompleteChurchIds: string[]
  hasChurches: boolean
}

export async function getOnboardingStatus(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OnboardingStatus> {
  const { data: userChurchRoles, error: rolesError } = await safeSelect(
    supabase,
    'user_church_roles',
    { filter: { column: 'user_id', value: userId } }
  )

  if (rolesError || !userChurchRoles?.length) {
    return { needsOnboarding: true, incompleteChurchIds: [], hasChurches: false }
  }

  const activeChurchIds = [
    ...new Set(
      userChurchRoles
        .filter((role) => role.is_active && role.church_id)
        .map((role) => role.church_id as string)
    ),
  ]

  if (activeChurchIds.length === 0) {
    return { needsOnboarding: true, incompleteChurchIds: [], hasChurches: false }
  }

  const { data: churches, error: churchesError } = await safeSelect(supabase, 'churches')
  if (churchesError || !churches) {
    return { needsOnboarding: false, incompleteChurchIds: [], hasChurches: true }
  }

  const userChurches = churches.filter(
    (church) => church.is_active && activeChurchIds.includes(church.id)
  )

  const incompleteChurchIds = userChurches
    .filter((church) => church.onboarding_completed_at === null)
    .map((church) => church.id)

  return {
    needsOnboarding: incompleteChurchIds.length > 0,
    incompleteChurchIds,
    hasChurches: userChurches.length > 0,
  }
}

export async function userNeedsOnboarding(userId: string): Promise<boolean> {
  const supabase = await createServerClient()
  const status = await getOnboardingStatus(supabase, userId)
  return status.needsOnboarding
}

export async function requireOnboardingComplete(): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const status = await getOnboardingStatus(supabase, user.id)
  if (status.needsOnboarding) {
    redirect('/onboarding')
  }
}
