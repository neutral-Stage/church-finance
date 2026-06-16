import { NextRequest, NextResponse } from 'next/server'
import { resolveMemberPortalToken } from '@/lib/member-portal'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const year = parseInt(
      searchParams.get('year') || String(new Date().getFullYear()),
      10
    )

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 })
    }

    const { data, error } = await resolveMemberPortalToken(token, year)

    if (error || !data) {
      return NextResponse.json({ error: error ?? 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      member: data.member,
      churchName: data.churchName,
      year: data.year,
      contributions: data.contributions,
      totalAmount: data.totalAmount,
    })
  } catch (err) {
    console.error('Member portal API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
