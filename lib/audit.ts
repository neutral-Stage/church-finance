import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLogParams {
  churchId?: string | null
  userId: string
  action: AuditAction
  entityType: string
  entityId: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
}

export interface FinancialAuditParams extends AuditLogParams {
  amount?: number
  transactionDate?: string
  fundId?: string | null
}

export async function logAuditEvent(
  supabase: SupabaseClient<Database>,
  params: AuditLogParams
): Promise<void> {
  try {
    const { error } = await (supabase.from('audit_log') as any).insert({
      church_id: params.churchId ?? null,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
    })

    if (error) {
      console.error('Failed to write audit log:', error.message)
    }
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

function enrichFinancialData(
  data: Record<string, unknown> | null | undefined,
  params: Pick<FinancialAuditParams, 'amount' | 'transactionDate' | 'fundId'>
): Record<string, unknown> | null {
  if (!data) return null

  return {
    ...data,
    ...(params.amount !== undefined ? { _audit_amount: params.amount } : {}),
    ...(params.transactionDate ? { _audit_transaction_date: params.transactionDate } : {}),
    ...(params.fundId ? { _audit_fund_id: params.fundId } : {}),
  }
}

/**
 * Log an audit event for a financial mutation with amount/date/fund metadata.
 */
export async function auditFinancialMutation(
  supabase: SupabaseClient<Database>,
  params: FinancialAuditParams
): Promise<void> {
  await logAuditEvent(supabase, {
    churchId: params.churchId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldData: enrichFinancialData(params.oldData, params),
    newData: enrichFinancialData(params.newData, params),
  })
}

/**
 * Execute a financial mutation and write an audit log entry on success.
 */
export async function withFinancialAudit<T>(
  supabase: SupabaseClient<Database>,
  params: Omit<FinancialAuditParams, 'newData' | 'oldData'> & {
    oldData?: Record<string, unknown> | null
    execute: () => Promise<T>
    mapNewData?: (result: T) => Record<string, unknown> | null
  }
): Promise<T> {
  const result = await params.execute()

  await auditFinancialMutation(supabase, {
    ...params,
    newData: params.mapNewData?.(result) ?? null,
  })

  return result
}
