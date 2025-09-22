import { Suspense } from 'react'
import { getLedgerEntriesData, checkUserPermissions } from '@/lib/server-data'
import { LedgerEntriesClient } from '@/components/ledger-entries-client'
import { FullScreenLoader } from '@/components/ui/loader'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

// This is now a Server Component
export default async function LedgerEntriesPage(): Promise<JSX.Element> {
  // All data fetching happens on the server
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