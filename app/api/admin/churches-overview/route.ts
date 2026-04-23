import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const { data: userRoles } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id }
    })

    if (!userRoles) {
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    const { data: roles } = await safeSelect(supabase, 'roles')
    const rolesMap = new Map((roles || []).map(role => [role.id, role]))

    const hasAdminAccess = userRoles?.some(ur => {
      const role = rolesMap.get(ur.role_id || '')
      return role?.name === 'super_admin' && ur.is_active
    })

    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all churches
    const { data: churches } = await safeSelect(supabase, 'churches', {
      order: { column: 'name', ascending: true }
    })

    if (!churches) {
      return NextResponse.json({ churches: [] })
    }

    // Get all funds
    const { data: allFunds } = await safeSelect(supabase, 'funds')

    // Get all transactions for summary
    const { data: allTransactions } = await safeSelect(supabase, 'transactions')

    // Get member counts (approximate using user_church_roles)
    const { data: allUserRoles } = await safeSelect(supabase, 'user_church_roles')

    // Build church overview data
    const churchesOverview = churches.map(church => {
      // Get funds for this church
      const churchFunds = allFunds?.filter(fund => fund.church_id === church.id) || []

      // Calculate total balance
      const totalBalance = churchFunds.reduce((sum, fund) => sum + (fund.current_balance || 0), 0)

      // Get member count
      const memberCount = allUserRoles?.filter(role =>
        role.church_id === church.id && role.is_active
      ).length || 0

      // Get recent transaction count (last 30 days) - transactions linked through funds
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const churchFundIds = churchFunds.map(fund => fund.id)
      const recentTransactions = allTransactions?.filter(transaction => {
        if (!transaction.fund_id || !churchFundIds.includes(transaction.fund_id)) return false
        const transactionDate = new Date(transaction.transaction_date)
        return transactionDate >= thirtyDaysAgo
      }).length || 0

      return {
        ...church,
        totalFunds: churchFunds.length,
        totalBalance,
        memberCount,
        recentTransactions,
        funds: churchFunds.map(fund => ({
          id: fund.id,
          name: fund.name,
          balance: fund.current_balance || 0,
          fund_type: fund.fund_type
        }))
      }
    })

    // Calculate system totals
    const systemStats = {
      totalChurches: churches.length,
      activeChurches: churches.filter(c => c.is_active).length,
      totalSystemBalance: churchesOverview.reduce((sum, church) => sum + church.totalBalance, 0),
      totalMembers: allUserRoles?.filter(role => role.is_active).length || 0,
      totalTransactionsThisMonth: allTransactions?.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date)
        const thisMonth = new Date()
        return transactionDate.getMonth() === thisMonth.getMonth() &&
               transactionDate.getFullYear() === thisMonth.getFullYear()
      }).length || 0
    }

    return NextResponse.json({
      churches: churchesOverview,
      systemStats
    })
  } catch (error) {
    console.error('Unexpected error in admin churches overview API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}