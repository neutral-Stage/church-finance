import { getFundsPageData } from '@/lib/server-data'
import FundsClient from '@/components/funds-client'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';

export default async function FundsPage() {
  const fundsPageData = await getFundsPageData()
  
  return <FundsClient initialData={fundsPageData} />
}