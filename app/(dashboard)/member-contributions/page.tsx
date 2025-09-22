import { getMemberContributionsData } from '@/lib/server-data'
import MemberContributionsClient from '@/components/member-contributions-client'

// Force dynamic rendering since this page requires server-side authentication
export const dynamic = 'force-dynamic';
export default async function MemberContributionsPage() {
  const memberContributionsData = await getMemberContributionsData()
  
  return <MemberContributionsClient initialData={memberContributionsData} />
}