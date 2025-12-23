import { Suspense } from 'react'
import { getLedgerEntriesData, checkUserPermissions, requireAuth } from '@/lib/server-data'
import { getSelectedChurch } from '@/lib/server-church-context'
import { LedgerEntriesClient } from '@/components/ledger-entries-client'
import { FullScreenLoader } from '@/components/ui/loader'
import { EmptyChurchState } from '@/components/empty-church-state'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

// This is now a Server Component
export default async function LedgerEntriesPage(): Promise<JSX.Element> {
  // Require authentication first - will redirect if not authenticated
  await requireAuth()

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch()
  if (!selectedChurch) {
    return <EmptyChurchState />
  }

  // All data fetching happens on the server with church context
  const [ledgerEntriesData, permissions] = await Promise.all([
    getLedgerEntriesData(),
    checkUserPermissions()
  ])

  return (
    <Suspense fallback={<FullScreenLoader message="Loading ledger entries..." />}>
      <LedgerEntriesClient
        initialData={ledgerEntriesData}
        permissions={permissions}
      />
    </Suspense>
  )
}