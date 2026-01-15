import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'
import { requireAdminAccess } from '@/lib/permission-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

interface ChurchFinancialData {
  id: string
  name: string
  type: string
  is_active: boolean
  created_at: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  established_date: string | null
  funds: {
    total_funds: number
    active_funds: number
    total_balance: number
    total_income: number
    total_expenses: number
    fund_types: Record<string, number>
  }
  recent_activity: {
    transactions_last_30_days: number
    offerings_last_30_days: number
    bills_pending: number
    advances_outstanding: number
  }
  member_count?: number
  user_count?: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin permissions using the new permission helper
    const authCheck = await requireAdminAccess(supabase as any, 'admin.churches.read')
    if (!authCheck.authorized) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error }, { status })
    }

    // Use admin client to bypass RLS for fetching all churches
    const adminClient = createAdminClient()

    // Get URL parameters for filtering
    const url = new URL(request.url)
    const churchType = url.searchParams.get('type')
    const isActive = url.searchParams.get('active')
    const search = url.searchParams.get('search')

    // Fetch all churches using admin client
    let churchesQuery = adminClient
      .from('churches')
      .select('*')
      .order('created_at', { ascending: false })

    if (churchType && churchType !== 'all') {
      churchesQuery = churchesQuery.eq('type', churchType)
    }

    if (isActive !== null) {
      churchesQuery = churchesQuery.eq('is_active', isActive === 'true')
    }

    if (search) {
      churchesQuery = churchesQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: churches, error: churchesError } = await churchesQuery

    if (churchesError) {
      console.error('Error fetching churches:', churchesError)
      return NextResponse.json({ error: 'Failed to fetch churches' }, { status: 500 })
    }

    if (!churches || churches.length === 0) {
      return NextResponse.json({ churches: [] })
    }

    // Get financial data for all churches
    const churchIds = churches.map((c: any) => c.id)

    // Fetch fund summaries
    const fundSummariesResult = await safeSelect(adminClient, 'funds');
    const fundSummaries = fundSummariesResult.data?.filter((fund: any) => churchIds.includes(fund.church_id)) || [];

    // Fetch recent transactions (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentTransactionsResult = await safeSelect(adminClient, 'transactions');
    const recentTransactions = recentTransactionsResult.data?.filter((tx: any) =>
      new Date(tx.created_at) >= thirtyDaysAgo
    ) || [];

    // Fetch recent offerings (last 30 days)
    const recentOfferingsResult = await safeSelect(adminClient, 'offerings');
    const recentOfferings = recentOfferingsResult.data?.filter((offering: any) =>
      new Date(offering.created_at || '') >= thirtyDaysAgo
    ) || [];

    // Fetch pending bills
    const pendingBillsResult = await safeSelect(adminClient, 'bills');
    const pendingBills = pendingBillsResult.data?.filter((bill: any) =>
      bill.status === 'pending'
    ) || [];

    // Fetch outstanding advances
    const outstandingAdvancesResult = await safeSelect(adminClient, 'advances');
    const outstandingAdvances = outstandingAdvancesResult.data?.filter((advance: any) =>
      advance.status === 'approved'
    ) || [];

    // Fetch user counts per church
    const userChurchCountsResult = await safeSelect(adminClient, 'user_church_roles');
    const userChurchCounts = userChurchCountsResult.data?.filter((role: any) =>
      role.is_active === true
    ) || [];

    // Group fund data by church
    const fundsByChurch = new Map<string, any[]>()
    fundSummaries?.forEach((fund: any) => {
      if (fund.church_id) {
        if (!fundsByChurch.has(fund.church_id)) {
          fundsByChurch.set(fund.church_id, [])
        }
        fundsByChurch.get(fund.church_id)!.push(fund)
      }
    })

    // Group transaction data by church
    const transactionsByChurch = new Map<string, number>()
    const offeringsByChurch = new Map<string, number>()

    recentTransactions?.forEach((transaction: any) => {
      const fund = fundSummaries?.find((f: any) => f.id === transaction.fund_id)
      if (fund?.church_id) {
        transactionsByChurch.set(
          fund.church_id,
          (transactionsByChurch.get(fund.church_id) || 0) + 1
        )
      }
    })

    // Process offerings by church
    recentOfferings?.forEach((offering: any) => {
      const allocations = offering.fund_allocations as any
      if (allocations && typeof allocations === 'object') {
        Object.keys(allocations).forEach(fundId => {
          const fund = fundSummaries?.find((f: any) => f.id === fundId)
          if (fund?.church_id) {
            offeringsByChurch.set(
              fund.church_id,
              (offeringsByChurch.get(fund.church_id) || 0) + 1
            )
          }
        })
      }
    })

    // Group bills and advances by church
    const billsByChurch = new Map<string, number>()
    const advancesByChurch = new Map<string, number>()

    pendingBills?.forEach((bill: any) => {
      const fund = fundSummaries?.find((f: any) => f.id === bill.fund_id)
      if (fund?.church_id) {
        billsByChurch.set(
          fund.church_id,
          (billsByChurch.get(fund.church_id) || 0) + 1
        )
      }
    })

    outstandingAdvances?.forEach((advance: any) => {
      const fund = fundSummaries?.find((f: any) => f.id === advance.fund_id)
      if (fund?.church_id && (!advance.amount_returned || advance.amount_returned < advance.amount)) {
        advancesByChurch.set(
          fund.church_id,
          (advancesByChurch.get(fund.church_id) || 0) + 1
        )
      }
    })

    // Count users per church
    const userCountsByChurch = new Map<string, number>()
    userChurchCounts?.forEach((ucr: any) => {
      if (ucr.church_id) {
        userCountsByChurch.set(
          ucr.church_id,
          (userCountsByChurch.get(ucr.church_id) || 0) + 1
        )
      }
    })

    // Build comprehensive church financial data
    const churchesWithFinancialData: ChurchFinancialData[] = churches.map((church: any) => {
      const churchFunds = fundsByChurch.get(church.id) || []

      // Calculate fund statistics
      const totalFunds = churchFunds.length
      const activeFunds = churchFunds.filter(f => f.is_active).length
      const totalBalance = churchFunds.reduce((sum, f) => sum + (f.current_balance || 0), 0)
      const totalIncome = churchFunds.reduce((sum, f) => sum + (f.total_income || 0), 0)
      const totalExpenses = churchFunds.reduce((sum, f) => sum + (f.total_expenses || 0), 0)

      // Group funds by type
      const fundTypes: Record<string, number> = {}
      churchFunds.forEach(fund => {
        const type = fund.fund_type || 'general'
        fundTypes[type] = (fundTypes[type] || 0) + (fund.current_balance || 0)
      })

      return {
        id: church.id,
        name: church.name,
        type: church.type,
        is_active: church.is_active || false,
        created_at: church.created_at || '',
        address: church.address,
        phone: church.phone,
        email: church.email,
        description: church.description,
        established_date: church.established_date,
        funds: {
          total_funds: totalFunds,
          active_funds: activeFunds,
          total_balance: totalBalance,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          fund_types: fundTypes
        },
        recent_activity: {
          transactions_last_30_days: transactionsByChurch.get(church.id) || 0,
          offerings_last_30_days: offeringsByChurch.get(church.id) || 0,
          bills_pending: billsByChurch.get(church.id) || 0,
          advances_outstanding: advancesByChurch.get(church.id) || 0
        },
        user_count: userCountsByChurch.get(church.id) || 0
      }
    })

    // Calculate summary statistics
    const totalChurches = churchesWithFinancialData.length
    const activeChurches = churchesWithFinancialData.filter(c => c.is_active).length
    const totalSystemBalance = churchesWithFinancialData.reduce((sum, c) => sum + c.funds.total_balance, 0)
    const totalSystemIncome = churchesWithFinancialData.reduce((sum, c) => sum + c.funds.total_income, 0)
    const totalSystemExpenses = churchesWithFinancialData.reduce((sum, c) => sum + c.funds.total_expenses, 0)
    const totalFundsAcrossSystem = churchesWithFinancialData.reduce((sum, c) => sum + c.funds.total_funds, 0)

    return NextResponse.json({
      churches: churchesWithFinancialData,
      summary: {
        total_churches: totalChurches,
        active_churches: activeChurches,
        total_system_balance: totalSystemBalance,
        total_system_income: totalSystemIncome,
        total_system_expenses: totalSystemExpenses,
        total_funds: totalFundsAcrossSystem,
        avg_balance_per_church: totalChurches > 0 ? totalSystemBalance / totalChurches : 0
      }
    })

  } catch (error) {
    console.error('Unexpected error in admin churches financial API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}