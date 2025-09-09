import { getMemberContributionsData } from '@/lib/server-data'
import MemberContributionsClient from '@/components/member-contributions-client'

export default async function MemberContributionsPage() {
  const memberContributionsData = await getMemberContributionsData()
  
  return <MemberContributionsClient initialData={memberContributionsData} />
}