import DashboardShell from '@/components/dashboard-shell'
import { requireOnboardingComplete } from '@/lib/onboarding-guard'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardingComplete()
  return <DashboardShell>{children}</DashboardShell>
}