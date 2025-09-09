import { getNotificationsData } from '@/lib/server-data'
import NotificationsClient from '@/components/notifications-client'

export default async function NotificationsPage() {
  const notificationsData = await getNotificationsData()
  
  return <NotificationsClient initialData={notificationsData} />
}