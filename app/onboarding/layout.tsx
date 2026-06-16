import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getOnboardingStatus } from '@/lib/onboarding-guard'

export const dynamic = 'force-dynamic'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const status = await getOnboardingStatus(supabase, user.id)
  if (!status.needsOnboarding && status.hasChurches) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
