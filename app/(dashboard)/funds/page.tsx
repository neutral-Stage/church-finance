import { getFundsPageData } from '@/lib/server-data'
import FundsClient from '@/components/funds-client'

export default async function FundsPage() {
  const fundsPageData = await getFundsPageData()
  
  return <FundsClient initialData={fundsPageData} />
}