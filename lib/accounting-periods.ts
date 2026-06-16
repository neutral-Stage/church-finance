import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AccountingPeriod = Database['public']['Tables']['accounting_periods']['Row']

export interface PeriodCheckResult {
  open: boolean
  period: AccountingPeriod | null
  year: number
  month: number
  error?: string
}

function parseYearMonth(date: string | Date): { year: number; month: number } {
  const d = typeof date === 'string' ? new Date(date) : date
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/**
 * Returns whether the accounting period for a date is open for mutations.
 * Missing period rows are treated as open (default).
 */
export async function checkPeriodOpen(
  supabase: SupabaseClient<Database>,
  churchId: string,
  date: string | Date
): Promise<PeriodCheckResult> {
  const { year, month } = parseYearMonth(date)

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('church_id', churchId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (error) {
    return {
      open: false,
      period: null,
      year,
      month,
      error: error.message,
    }
  }

  if (!data) {
    return { open: true, period: null, year, month }
  }

  return {
    open: data.status === 'open',
    period: data,
    year,
    month,
    error: data.status !== 'open' ? `Accounting period ${year}-${String(month).padStart(2, '0')} is closed` : undefined,
  }
}

export interface ClosePeriodResult {
  success: boolean
  period?: AccountingPeriod
  error?: string
}

/**
 * Close an accounting period for a church/year/month.
 */
export async function closePeriod(
  supabase: SupabaseClient<Database>,
  churchId: string,
  year: number,
  month: number,
  userId: string
): Promise<ClosePeriodResult> {
  if (month < 1 || month > 12) {
    return { success: false, error: 'Month must be between 1 and 12' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('church_id', churchId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (existing?.status === 'closed') {
    return { success: true, period: existing }
  }

  const closedAt = new Date().toISOString()

  if (existing) {
    const { data, error } = await (supabase.from('accounting_periods') as any)
      .update({
        status: 'closed',
        closed_at: closedAt,
        closed_by: userId,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, period: data as AccountingPeriod }
  }

  const { data, error } = await (supabase.from('accounting_periods') as any)
    .insert({
      church_id: churchId,
      year,
      month,
      status: 'closed',
      closed_at: closedAt,
      closed_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, period: data as AccountingPeriod }
}
