import { supabase } from '@/lib/supabase'
import type { DashboardData } from '@/lib/server-data'
import type { BillWithFund, AdvanceWithFund, TransactionWithFund, FundSummary } from '@/types/database'

export async function refreshDashboardData(churchId: string): Promise<DashboardData | null> {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const nextMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1
  ).toISOString().slice(0, 10)

  const [fundsResult, transactionsResult, allBillsResult, allAdvancesResult, allTransactionsResult] =
    await Promise.all([
      supabase
        .from('funds')
        .select('*')
        .eq('church_id', churchId)
        .order('name', { ascending: true }),
      supabase
        .from('transactions')
        .select(`*, fund:funds(id, name, church_id)`)
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('bills')
        .select(`*, fund:funds(id, name, church_id)`)
        .eq('church_id', churchId)
        .order('due_date', { ascending: true })
        .limit(50),
      supabase
        .from('advances')
        .select(`*, fund:funds(id, name, church_id)`)
        .eq('church_id', churchId)
        .order('expected_return_date', { ascending: true })
        .limit(50),
      supabase
        .from('transactions')
        .select(`*, fund:funds(id, name, church_id)`)
        .eq('church_id', churchId),
    ])

  if (fundsResult.error || transactionsResult.error) {
    return null
  }

  const fundsMap = new Map((fundsResult.data || []).map((fund) => [fund.id, fund]))

  const recentTransactions: TransactionWithFund[] = (transactionsResult.data || []).map((transaction) => ({
    ...transaction,
    fund: transaction.fund_id ? fundsMap.get(transaction.fund_id) : undefined,
  }))

  const upcomingBills: BillWithFund[] = (allBillsResult.data || [])
    .filter((bill) => ['pending', 'overdue'].includes(bill.status || ''))
    .slice(0, 5)
    .map((bill) => {
      const joined = bill as typeof bill & { fund?: BillWithFund['fund'] }
      return {
        ...bill,
        fund: joined.fund ?? (bill.fund_id ? fundsMap.get(bill.fund_id) : undefined),
      }
    })

  const outstandingAdvances: AdvanceWithFund[] = (allAdvancesResult.data || [])
    .filter((advance) => ['outstanding', 'partial'].includes(advance.status || ''))
    .slice(0, 5)
    .map((advance) => ({
      ...advance,
      funds: advance.fund_id ? fundsMap.get(advance.fund_id) : undefined,
    }))

  const monthlyTransactions = (allTransactionsResult.data || []).filter(
    (t) =>
      t.transaction_date >= `${currentMonth}-01` && t.transaction_date < nextMonth
  )

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const funds: FundSummary[] = (fundsResult.data || []).map((rawFund) => {
    const fund = rawFund as typeof rawFund & {
      total_income?: number | null
      total_expenses?: number | null
      total_offerings?: number | null
    }
    return {
      id: fund.id || '',
      name: fund.name || '',
      church_id: fund.church_id,
      created_at: fund.created_at,
      created_by: fund.created_by,
      current_balance: fund.current_balance || 0,
      description: fund.description,
      fund_type: fund.fund_type,
      is_active: fund.is_active ?? true,
      target_amount: fund.target_amount,
      updated_at: fund.updated_at,
      transaction_count: 0,
      total_income: fund.total_income ?? null,
      total_expenses: fund.total_expenses ?? null,
      total_offerings: fund.total_offerings ?? null,
    }
  })

  return {
    funds,
    recentTransactions,
    upcomingBills,
    outstandingAdvances,
    monthlyStats: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netIncome: monthlyIncome - monthlyExpenses,
    },
  }
}

export async function fetchChartTransactions(churchId: string, months = 12) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)

  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date, type, amount, fund_id')
    .eq('church_id', churchId)
    .gte('transaction_date', startDate.toISOString().slice(0, 10))
    .order('transaction_date', { ascending: true })

  if (error) return []
  return data || []
}
