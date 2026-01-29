import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createServices, type ApiResult } from '@/lib/type-safe-api'
import type { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type FundInsert = Database['public']['Tables']['funds']['Insert']

// GET /api/funds - Get all funds
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const services = createServices(supabase as any)

    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')
    const useSummary = searchParams.get('summary') === 'true'

    let result: ApiResult<any>

    if (useSummary) {
      result = await services.funds.getFundSummaries(churchId || undefined)
    } else {
      result = await services.funds.getFunds(churchId || undefined)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      funds: result.data,
      success: true
    })
  } catch (error) {
    console.error('Funds API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/funds - Create a new fund
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const services = createServices(supabase as any)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Funds POST] Creating fund for user:', user.id, 'church:', body.church_id)

    const fundData: FundInsert = {
      name: body.name,
      description: body.description || null,
      target_amount: body.target_amount || null,
      fund_type: body.fund_type || null,
      current_balance: body.current_balance || 0,
      church_id: body.church_id || null,
      is_active: true
    }

    if (!fundData.name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      )
    }

    if (!fundData.church_id) {
      return NextResponse.json(
        { error: 'Church ID is required' },
        { status: 400 }
      )
    }

    const result = await services.funds.createFund(fundData)

    if (!result.success) {
      console.error('[Funds POST] Creation failed:', result.error)
      const status = result.error?.includes('Unauthorized') ? 401 : 500
      return NextResponse.json(
        { error: result.error },
        { status }
      )
    }

    return NextResponse.json({
      fund: result.data,
      success: true
    }, { status: 201 })
  } catch (error: any) {
    console.error('Fund creation error:', error)
    if (error?.code === '42501') {
      return NextResponse.json(
        { error: 'Permission denied: You do not have access to create funds for this church.' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

