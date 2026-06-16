/**
 * Cron-ready stub for processing recurring bills based on their frequency field.
 * Wire to: node scripts/process-recurring-bills.js (see cron/notifications.cron)
 */

export type BillFrequency = 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringBill {
  id: string
  vendor_name: string
  amount: number
  due_date: string
  frequency: BillFrequency | string | null
  church_id: string
  fund_id?: string | null
  category?: string | null
  status?: string | null
}

function addInterval(date: Date, frequency: BillFrequency): Date {
  const next = new Date(date)
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      break
  }
  return next
}

function normalizeFrequency(freq: string | null | undefined): BillFrequency {
  const f = (freq || 'one-time').toLowerCase() as BillFrequency
  if (['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'].includes(f)) return f
  return 'one-time'
}

export interface RecurringBillAction {
  billId: string
  action: 'create_next' | 'skip'
  nextDueDate?: string
  reason: string
}

/**
 * Determine which recurring bills need a new instance created.
 * Does not mutate the database — callers should insert new bill rows.
 */
export function planRecurringBillActions(
  bills: RecurringBill[],
  asOf: Date = new Date()
): RecurringBillAction[] {
  const actions: RecurringBillAction[] = []
  const today = asOf.toISOString().slice(0, 10)

  for (const bill of bills) {
    const frequency = normalizeFrequency(bill.frequency)

    if (frequency === 'one-time') {
      actions.push({ billId: bill.id, action: 'skip', reason: 'one-time bill' })
      continue
    }

    if (bill.status === 'paid' && bill.due_date <= today) {
      const nextDate = addInterval(new Date(bill.due_date), frequency)
      actions.push({
        billId: bill.id,
        action: 'create_next',
        nextDueDate: nextDate.toISOString().slice(0, 10),
        reason: `paid ${frequency} bill due for next cycle`,
      })
    } else {
      actions.push({
        billId: bill.id,
        action: 'skip',
        reason: bill.status !== 'paid' ? 'bill not yet paid' : 'due date in future',
      })
    }
  }

  return actions
}

export interface ProcessRecurringBillsResult {
  processed: number
  created: number
  skipped: number
  errors: string[]
}

/**
 * Process recurring bills using an injected Supabase admin client.
 * Intended to be called from a cron script or internal API route.
 */
export async function processRecurringBills(
  supabaseAdmin: {
    from: (table: string) => {
      select: (cols: string) => {
        neq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ data: RecurringBill[] | null; error: Error | null }>
        }
      }
      insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>
    }
  },
  asOf: Date = new Date()
): Promise<ProcessRecurringBillsResult> {
  const result: ProcessRecurringBillsResult = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [],
  }

  const { data: bills, error } = await supabaseAdmin
    .from('bills')
    .select('id, vendor_name, amount, due_date, frequency, church_id, fund_id, category, status')
    .neq('frequency', 'one-time')
    .eq('status', 'paid')

  if (error) {
    result.errors.push(error.message)
    return result
  }

  const actions = planRecurringBillActions(bills || [], asOf)

  for (const action of actions) {
    result.processed++
    if (action.action === 'skip') {
      result.skipped++
      continue
    }

    const source = (bills || []).find((b) => b.id === action.billId)
    if (!source || !action.nextDueDate) {
      result.skipped++
      continue
    }

    const { error: insertError } = await supabaseAdmin.from('bills').insert({
      vendor_name: source.vendor_name,
      amount: source.amount,
      due_date: action.nextDueDate,
      frequency: source.frequency,
      church_id: source.church_id,
      fund_id: source.fund_id,
      category: source.category || 'General',
      status: 'pending',
      notes: `Auto-generated from recurring bill ${source.id}`,
    })

    if (insertError) {
      result.errors.push(`Bill ${source.id}: ${insertError.message}`)
    } else {
      result.created++
    }
  }

  return result
}

/** Alias for cron routes and external callers */
export const executeRecurringBills = processRecurringBills
