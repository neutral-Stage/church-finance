import { getReportsData } from '@/lib/server-data'
import { getMonthStart, getMonthEnd } from '@/lib/utils'
import AdvancedReportsClient from '@/components/advanced-reports-client'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';
export default async function ReportsPage() {
  const now = new Date()
  const initialDateRange = {
    startDate: getMonthStart(now),
    endDate: getMonthEnd(now)
  }
  
  const reportsData = await getReportsData(initialDateRange)
  
  return <AdvancedReportsClient initialData={reportsData} initialDateRange={initialDateRange} />
}