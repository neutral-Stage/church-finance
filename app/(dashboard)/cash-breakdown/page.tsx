import { getCashBreakdownData } from '@/lib/server-data'
import CashBreakdownClient from '@/components/cash-breakdown-client'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

export default async function CashBreakdownPage() {
  const cashBreakdownData = await getCashBreakdownData()
  
  return <CashBreakdownClient initialData={cashBreakdownData} />
}