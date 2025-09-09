import { Suspense } from 'react'
import { getMembersData, checkUserPermissions } from '@/lib/server-data'
import { MembersClient } from '@/components/members-client'
import { FullScreenLoader } from '@/components/ui/loader'

// This is now a Server Component
export default async function MembersPage() {
  // All data fetching happens on the server
  const [membersData, permissions] = await Promise.all([
    getMembersData(),
    checkUserPermissions()
  ])

  return (
    <Suspense fallback={<FullScreenLoader message="Loading members..." />}>
      <MembersClient
        initialData={membersData}
        permissions={permissions}
      />
    </Suspense>
  )
}