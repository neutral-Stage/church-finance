import { getNotificationsData, requireAuth } from '@/lib/server-data'
import { getSelectedChurch } from '@/lib/server-church-context'
import NotificationsClient from '@/components/notifications-client'
import { EmptyChurchState } from '@/components/empty-church-state'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  // Require authentication first - will redirect if not authenticated
  await requireAuth()

  // Get selected church - if no church is selected, show empty state
  const selectedChurch = await getSelectedChurch()
  if (!selectedChurch) {
    return <EmptyChurchState />
  }

  const notificationsData = await getNotificationsData()

  return <NotificationsClient initialData={notificationsData} />
}