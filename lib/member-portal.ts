import { createAdminClient } from '@/lib/supabase-server'
import { isDemoMode } from '@/lib/demo/config'
import { getDemoMemberContributions } from '@/lib/demo/fixtures'

export interface PortalContribution {
  id: string
  service_date: string
  type: string
  amount: number
  fund_name: string
  notes?: string
}

export interface MemberPortalData {
  member: {
    id: string
    name: string
    church_id: string | null
  }
  churchName: string
  contributions: PortalContribution[]
  totalAmount: number
  year: number
}

export async function resolveMemberPortalToken(
  token: string,
  year: number
): Promise<{ data: MemberPortalData | null; error: string | null }> {
  if (!token?.trim()) {
    return { data: null, error: 'Missing portal token' }
  }

  if (isDemoMode()) {
    const contrib = getDemoMemberContributions()[0]
    if (!contrib) {
      return { data: null, error: 'No demo contributions available' }
    }
    const yearContributions = contrib.contributions.filter((c) =>
      c.service_date.startsWith(String(year))
    )
    return {
      data: {
        member: {
          id: contrib.member.id,
          name: contrib.member.name,
          church_id: null,
        },
        churchName: 'Grace Fellowship (Demo)',
        contributions: yearContributions,
        totalAmount: yearContributions.reduce((sum, c) => sum + c.amount, 0),
        year,
      },
      error: null,
    }
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: portalToken, error: tokenError } = await supabase
    .from('member_portal_tokens')
    .select('id, member_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError) {
    return { data: null, error: 'Failed to validate portal token' }
  }

  if (!portalToken) {
    return { data: null, error: 'Invalid or expired portal link' }
  }

  if (portalToken.expires_at < now) {
    return { data: null, error: 'This portal link has expired. Request a new one from your church.' }
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, church_id')
    .eq('id', portalToken.member_id)
    .single()

  if (memberError || !member) {
    return { data: null, error: 'Member not found' }
  }

  let churchName = 'Your Church'
  if (member.church_id) {
    const { data: church } = await supabase
      .from('churches')
      .select('name')
      .eq('id', member.church_id)
      .single()
    if (church?.name) churchName = church.name
  }

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data: offeringsData, error: offeringsError } = await supabase
    .from('offerings')
    .select(`
      id,
      service_date,
      type,
      amount,
      notes,
      offering_member!inner(
        amount,
        member_id,
        fund:funds(name)
      )
    `)
    .eq('offering_member.member_id', member.id)
    .gte('service_date', startDate)
    .lte('service_date', endDate)
    .order('service_date', { ascending: false })

  if (offeringsError) {
    return { data: null, error: 'Failed to load giving history' }
  }

  const contributions: PortalContribution[] = []

  for (const offering of offeringsData || []) {
    const offeringMembers = Array.isArray(offering.offering_member)
      ? offering.offering_member
      : [offering.offering_member]

    for (const om of offeringMembers) {
      if (!om || om.member_id !== member.id) continue
      contributions.push({
        id: offering.id,
        service_date: offering.service_date,
        type: offering.type,
        amount: Number(om.amount ?? offering.amount),
        fund_name: om.fund?.name || 'General',
        notes: offering.notes || undefined,
      })
    }
  }

  return {
    data: {
      member: {
        id: member.id,
        name: member.name,
        church_id: member.church_id,
      },
      churchName,
      contributions,
      totalAmount: contributions.reduce((sum, c) => sum + c.amount, 0),
      year,
    },
    error: null,
  }
}
