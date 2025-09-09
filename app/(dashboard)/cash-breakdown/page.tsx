import { getCashBreakdownData } from '@/lib/server-data'
import CashBreakdownClient from '@/components/cash-breakdown-client'

export default async function CashBreakdownPage() {
  const cashBreakdownData = await getCashBreakdownData()
  
  return <CashBreakdownClient initialData={cashBreakdownData} />
}