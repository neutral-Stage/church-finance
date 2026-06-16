import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSelectedChurch } from '@/lib/server-church-context'
import {
  buildGivingStatementInput,
  generateGivingStatementPdf,
} from '@/lib/giving-statements'
import type { MemberContribution } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
    const batch = searchParams.get('batch') === 'true'

    const selectedChurch = await getSelectedChurch()
    if (!selectedChurch) {
      return NextResponse.json({ error: 'No church selected' }, { status: 400 })
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
          member:members(id, name, church_id),
          fund:funds(name)
        )
      `)
      .eq('offering_member.member.church_id', selectedChurch.id)
      .gte('service_date', startDate)
      .lte('service_date', endDate)

    if (offeringsError) {
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    const memberMap = new Map<string, MemberContribution>()

    for (const offering of offeringsData || []) {
      const offeringMembers = Array.isArray(offering.offering_member)
        ? offering.offering_member
        : [offering.offering_member]

      for (const om of offeringMembers) {
        if (!om?.member) continue
        const mid = om.member.id
        if (memberId && mid !== memberId) continue

        if (!memberMap.has(mid)) {
          memberMap.set(mid, {
            member: {
              id: mid,
              name: om.member.name,
            },
            contributions: [],
            total_amount: 0,
            contribution_count: 0,
            last_contribution_date: offering.service_date,
            missing_months: 0,
            missing_months_list: [],
            average_monthly_amount: 0,
            average_annual_amount: 0,
            months_with_contributions: 0,
          })
        }

        const entry = memberMap.get(mid)!
        const amount = Number(om.amount ?? offering.amount)
        entry.contributions.push({
          id: offering.id,
          service_date: offering.service_date,
          type: offering.type,
          amount,
          fund_name: om.fund?.name || 'General',
          notes: offering.notes || undefined,
        })
        entry.total_amount += amount
        entry.contribution_count += 1
      }
    }

    const contributions = Array.from(memberMap.values())

    if (memberId && contributions.length === 0) {
      return NextResponse.json({ error: 'No contributions found for member' }, { status: 404 })
    }

    if (batch) {
      const zipNote = contributions.map((c) =>
        buildGivingStatementInput(c, selectedChurch.name, year)
      )
      return NextResponse.json({
        success: true,
        statements: zipNote,
        churchName: selectedChurch.name,
        year,
      })
    }

    const target = memberId
      ? contributions[0]
      : contributions[0]

    if (!target) {
      return NextResponse.json({ error: 'No contributions found' }, { status: 404 })
    }

    const input = buildGivingStatementInput(target, selectedChurch.name, year)
    const doc = generateGivingStatementPdf(input)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    const safeName = input.memberName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="giving-statement-${safeName}-${year}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Giving statements API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
