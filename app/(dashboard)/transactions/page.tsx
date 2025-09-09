import { Suspense } from 'react'
import { getTransactionsData, checkUserPermissions } from '@/lib/server-data'
import { TransactionsClient } from '@/components/transactions-client'
import { FullScreenLoader } from '@/components/ui/loader'

// This is now a Server Component
export default async function TransactionsPage() {
  // All data fetching happens on the server
  const [transactionsData, permissions] = await Promise.all([
    getTransactionsData(),
    checkUserPermissions()
  ])

  return (
    <Suspense fallback={<FullScreenLoader message="Loading transactions..." />}>
      <TransactionsClient
        initialData={transactionsData}
        permissions={permissions}
      />
    </Suspense>
  )
}