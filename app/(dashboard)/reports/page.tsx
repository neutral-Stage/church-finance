import { getReportsData } from '@/lib/server-data'
import { getMonthStart, getMonthEnd } from '@/lib/utils'
import ReportsClient from '@/components/reports-client'

export default async function ReportsPage() {
  const now = new Date()
  const initialDateRange = {
    startDate: getMonthStart(now),
    endDate: getMonthEnd(now)
  }
  
  const reportsData = await getReportsData(initialDateRange)
  
  return <ReportsClient initialData={reportsData} initialDateRange={initialDateRange} />
}