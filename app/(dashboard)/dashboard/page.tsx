import { getDashboardData, checkUserPermissions, requireAuth } from '@/lib/server-data'
import { DashboardClient } from '@/components/dashboard-client'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

// This is now a Server Component
export default async function DashboardPage(): Promise<JSX.Element> {
  // Require authentication first - will redirect if not authenticated
  const user = await requireAuth()
  
  // All data fetching happens on the server
  const [dashboardData, permissions] = await Promise.all([
    getDashboardData(),
    checkUserPermissions()
  ])

  return (
    <DashboardClient 
      initialData={dashboardData} 
      permissions={permissions}
      serverUser={user}
    />
  )
}