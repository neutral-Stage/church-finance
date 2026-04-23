import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'

export const dynamic = 'force-dynamic'

// ─── In-process rate limiter (10 requests per 60 s per user) ─────────────────
// Simple sliding-window counter stored in module memory. Resets on cold start.
// For a multi-instance Vercel deployment, upgrade this to Upstash/Redis.
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const _rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const entry = _rateLimitMap.get(userId)
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    _rateLimitMap.set(userId, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS }
  }
  entry.count++
  const resetMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - entry.count), resetMs }
}

// Lazy-init: don't instantiate the client at module load so a missing
// GROQ_API_KEY doesn't kill the function at cold start.
let _groq: Groq | null = null
function getGroq(): Groq {
  if (_groq) return _groq
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('AI chat is not configured: GROQ_API_KEY is not set on the server.')
  }
  _groq = new Groq({ apiKey })
  return _groq
}

// Map a DB role name to the canonical viewer/treasurer/admin tier used by
// this route's permission gates. Anything unrecognized falls back to viewer.
function canonicalizeRole(name: string | null | undefined): 'viewer' | 'treasurer' | 'admin' {
  const n = (name || '').toLowerCase()
  if (n === 'super_admin' || n === 'church_admin' || n === 'admin') return 'admin'
  if (n === 'treasurer') return 'treasurer'
  return 'viewer'
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: any[] = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_summary',
      description: 'Get an overview of the church finances including total income, expenses, fund balances, and recent transactions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Retrieve a list of transactions. Can be filtered by type (income/expense), date range, or fund.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'expense'], description: 'Filter by transaction type' },
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          limit: { type: 'number', description: 'Max number of results (default 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: 'Create a new financial transaction (income or expense). Requires treasurer or admin role.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income', 'expense'], description: 'Transaction type' },
          amount: { type: 'number', description: 'Amount in BDT (Bangladeshi Taka)' },
          description: { type: 'string', description: 'Description of the transaction' },
          category: { type: 'string', description: 'Category (e.g., Salary, Utilities, Donation, etc.)' },
          payment_method: { type: 'string', description: 'Payment method (cash, bank_transfer, check, mobile_banking)' },
          transaction_date: { type: 'string', description: 'Date of transaction (YYYY-MM-DD), defaults to today' },
        },
        required: ['type', 'amount', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_transaction',
      description: 'Update an existing transaction by ID. Requires treasurer or admin role.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to update' },
          amount: { type: 'number', description: 'New amount' },
          description: { type: 'string', description: 'New description' },
          category: { type: 'string', description: 'New category' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_transaction',
      description: 'Delete a transaction by ID. Requires admin role only.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Transaction ID to delete' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_offerings',
      description: 'Get a list of offerings and tithes.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          limit: { type: 'number', description: 'Max number of results' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_offering',
      description: 'Record a new offering/tithe. Requires treasurer or admin role.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Type of offering (e.g., tithe, special, general)' },
          amount: { type: 'number', description: 'Total amount collected' },
          service_date: { type: 'string', description: 'Date of service (YYYY-MM-DD)' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['type', 'amount', 'service_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_members',
      description: 'Get a list of church members.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max number of results' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_member',
      description: 'Add a new church member. Requires treasurer or admin role.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the member' },
          phone: { type: 'string', description: 'Phone number' },
          location: { type: 'string', description: 'Location/address' },
          fellowship_name: { type: 'string', description: 'Fellowship/group name' },
          job: { type: 'string', description: 'Occupation' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_funds',
      description: 'Get all funds and their current balances.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bills',
      description: 'Get bills and petty cash entries.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status (pending, paid, overdue)' },
          limit: { type: 'number', description: 'Max results' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_bill',
      description: 'Create a new bill/expense entry. Requires treasurer or admin role.',
      parameters: {
        type: 'object',
        properties: {
          vendor_name: { type: 'string', description: 'Name of vendor or payee' },
          category: { type: 'string', description: 'Category (utilities, salary, maintenance, etc.)' },
          amount: { type: 'number', description: 'Bill amount' },
          due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
          frequency: { type: 'string', description: 'Frequency (one-time, monthly, yearly)' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['vendor_name', 'category', 'amount', 'due_date', 'frequency'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_advances',
      description: 'Get a list of advances given to persons.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status (pending, returned, partial)' },
          limit: { type: 'number', description: 'Max results' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate a financial report for a specific period.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['income_expense', 'offering_summary', 'fund_balance', 'monthly_summary'], description: 'Type of report' },
          period: { type: 'string', enum: ['this_month', 'last_month', 'this_year', 'last_year', 'custom'], description: 'Time period' },
          start_date: { type: 'string', description: 'Required if period is custom (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'Required if period is custom (YYYY-MM-DD)' },
        },
        required: ['type', 'period'],
      },
    },
  },
]

// ─── Permission guard ─────────────────────────────────────────────────────────

const WRITE_TOOLS = ['create_transaction', 'update_transaction', 'create_offering', 'create_member', 'create_bill']
const DELETE_TOOLS = ['delete_transaction']
const TREASURER_TOOLS = [...WRITE_TOOLS]
const ADMIN_TOOLS = [...DELETE_TOOLS]

function checkPermission(toolName: string, userRole: string): string | null {
  if (ADMIN_TOOLS.includes(toolName) && userRole !== 'admin') {
    return `Permission denied: Deleting records requires admin role. Your role is "${userRole}".`
  }
  if (TREASURER_TOOLS.includes(toolName) && !['treasurer', 'admin'].includes(userRole)) {
    return `Permission denied: Creating or updating records requires treasurer or admin role. Your role is "${userRole}".`
  }
  return null
}

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  churchId: string,
  userRole: string,
): Promise<string> {
  // Permission check
  const permError = checkPermission(toolName, userRole)
  if (permError) return JSON.stringify({ error: permError })

  try {
    const supabase = await createServerClient()
    const today = new Date().toISOString().split('T')[0]

    switch (toolName) {
      case 'get_dashboard_summary': {
        const [txResult, fundResult, offeringResult] = await Promise.all([
          supabase.from('transactions').select('type, amount').eq('church_id', churchId),
          supabase.from('funds').select('name, current_balance, fund_type').eq('church_id', churchId).eq('is_active', true),
          supabase.from('offerings').select('amount, service_date, type').eq('church_id', churchId).order('service_date', { ascending: false }).limit(5),
        ])
        const transactions = (txResult.data || []) as Array<{ type: string; amount: number }>
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return JSON.stringify({
          total_income: totalIncome,
          total_expenses: totalExpense,
          net_balance: totalIncome - totalExpense,
          funds: fundResult.data || [],
          recent_offerings: offeringResult.data || [],
        })
      }

      case 'get_transactions': {
        let query = supabase
          .from('transactions')
          .select('id, type, amount, description, category, payment_method, transaction_date, fund_id')
          .eq('church_id', churchId)
          .order('transaction_date', { ascending: false })
          .limit((args.limit as number) || 20)
        if (args.type) query = query.eq('type', args.type as string)
        if (args.start_date) query = query.gte('transaction_date', args.start_date as string)
        if (args.end_date) query = query.lte('transaction_date', args.end_date as string)
        const { data, error } = await query
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ transactions: data, count: data?.length })
      }

      case 'create_transaction': {
        // Get a default fund for this church
        const { data: defaultFund } = await supabase
          .from('funds').select('id').eq('church_id', churchId).eq('is_active', true).limit(1).single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('transactions') as any).insert({
          type: args.type as string,
          amount: args.amount as number,
          description: args.description as string,
          category: (args.category as string) || 'General',
          payment_method: (args.payment_method as string) || 'cash',
          transaction_date: (args.transaction_date as string) || today,
          church_id: churchId,
          fund_id: defaultFund?.id || null,
        }).select().single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, transaction: data, message: `Transaction created successfully with ID: ${(data as { id?: string })?.id}` })
      }

      case 'update_transaction': {
        const { id, ...updates } = args
        // Use the user's authenticated client (RLS applies) and explicitly
        // scope to the current church as defense in depth.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('transactions') as any)
          .update(updates)
          .eq('id', id as string)
          .eq('church_id', churchId)
          .select()
          .single()
        if (error) return JSON.stringify({ error: error.message })
        if (!data) return JSON.stringify({ error: 'Transaction not found in this church.' })
        return JSON.stringify({ success: true, transaction: data, message: 'Transaction updated successfully' })
      }

      case 'delete_transaction': {
        const { data, error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', args.id as string)
          .eq('church_id', churchId)
          .select('id')
        if (error) return JSON.stringify({ error: error.message })
        if (!data || data.length === 0) return JSON.stringify({ error: 'Transaction not found in this church or you lack permission to delete it.' })
        return JSON.stringify({ success: true, message: 'Transaction deleted successfully' })
      }

      case 'get_offerings': {
        let query = supabase
          .from('offerings')
          .select('id, type, amount, service_date, notes')
          .eq('church_id', churchId)
          .order('service_date', { ascending: false })
          .limit((args.limit as number) || 20)
        if (args.start_date) query = query.gte('service_date', args.start_date as string)
        if (args.end_date) query = query.lte('service_date', args.end_date as string)
        const { data, error } = await query
        if (error) return JSON.stringify({ error: error.message })
        const total = (data || []).reduce((s: number, o: { amount: number }) => s + o.amount, 0)
        return JSON.stringify({ offerings: data, total_amount: total, count: data?.length })
      }

      case 'create_offering': {
        const { data: defaultFund } = await supabase.from('funds').select('id').eq('church_id', churchId).limit(1).single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('offerings') as any).insert({
          type: args.type as string,
          amount: args.amount as number,
          service_date: args.service_date as string,
          notes: (args.notes as string) || null,
          church_id: churchId,
          fund_allocations: { [(defaultFund?.id || 'general') as string]: args.amount } as Record<string, unknown>,
        }).select().single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, offering: data, message: `Offering recorded successfully with ID: ${(data as { id?: string })?.id}` })
      }

      case 'get_members': {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, phone, location, fellowship_name, job')
          .eq('church_id', churchId)
          .order('name')
          .limit((args.limit as number) || 50)
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ members: data, count: data?.length })
      }

      case 'create_member': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('members') as any).insert({
          name: args.name as string,
          phone: (args.phone as string) || null,
          location: (args.location as string) || null,
          fellowship_name: (args.fellowship_name as string) || null,
          job: (args.job as string) || null,
          church_id: churchId,
        }).select().single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, member: data, message: `Member "${args.name}" added successfully` })
      }

      case 'get_funds': {
        const { data, error } = await supabase
          .from('funds')
          .select('id, name, fund_type, current_balance, target_amount, description, is_active')
          .eq('church_id', churchId)
          .order('name')
        if (error) return JSON.stringify({ error: error.message })
        const totalBalance = (data || []).reduce((s: number, f: { current_balance?: number | null }) => s + (f.current_balance || 0), 0)
        return JSON.stringify({ funds: data, total_balance: totalBalance })
      }

      case 'get_bills': {
        let query = supabase
          .from('bills')
          .select('id, vendor_name, category, amount, due_date, status, frequency, notes')
          .eq('church_id', churchId)
          .order('due_date', { ascending: true })
          .limit((args.limit as number) || 20)
        if (args.status) query = query.eq('status', args.status as string)
        const { data, error } = await query
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ bills: data, count: data?.length })
      }

      case 'create_bill': {
        const { data: defaultFund } = await supabase.from('funds').select('id').eq('church_id', churchId).eq('is_active', true).limit(1).single()
        if (!defaultFund?.id) {
          return JSON.stringify({ error: 'No active fund exists for this church. Create a fund first.' })
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('bills') as any).insert({
          vendor_name: args.vendor_name as string,
          category: args.category as string,
          amount: args.amount as number,
          due_date: args.due_date as string,
          frequency: args.frequency as string,
          notes: (args.notes as string) || null,
          fund_id: defaultFund.id,
          church_id: churchId,
          status: 'pending',
        }).select().single()
        if (error) return JSON.stringify({ error: error.message })
        return JSON.stringify({ success: true, bill: data, message: `Bill for "${args.vendor_name}" created successfully` })
      }

      case 'get_advances': {
        let query = supabase
          .from('advances')
          .select('id, recipient_name, amount, amount_returned, purpose, advance_date, expected_return_date, status, payment_method')
          .eq('church_id', churchId)
          .order('advance_date', { ascending: false })
          .limit((args.limit as number) || 20)
        if (args.status) query = query.eq('status', args.status as string)
        const { data, error } = await query
        if (error) return JSON.stringify({ error: error.message })
        const totalPending = (data || [])
          .filter((a: { status?: string | null }) => a.status !== 'returned')
          .reduce((s: number, a: { amount: number; amount_returned?: number | null }) => s + a.amount - (a.amount_returned || 0), 0)
        return JSON.stringify({ advances: data, total_pending: totalPending, count: data?.length })
      }

      case 'generate_report': {
        let startDate = '', endDate = today
        const now = new Date()
        switch (args.period) {
          case 'this_month':
            startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
            break
          case 'last_month': {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            startDate = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`
            endDate = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth(), 0).getDate()}`
            break
          }
          case 'this_year':
            startDate = `${now.getFullYear()}-01-01`
            break
          case 'last_year':
            startDate = `${now.getFullYear() - 1}-01-01`
            endDate = `${now.getFullYear() - 1}-12-31`
            break
          case 'custom':
            startDate = args.start_date as string
            endDate = args.end_date as string
            break
        }

        const [txResult, offerResult] = await Promise.all([
          supabase.from('transactions').select('type, amount, category, transaction_date')
            .eq('church_id', churchId).gte('transaction_date', startDate).lte('transaction_date', endDate),
          supabase.from('offerings').select('type, amount, service_date')
            .eq('church_id', churchId).gte('service_date', startDate).lte('service_date', endDate),
        ])

        const transactions = (txResult.data || []) as Array<{ type: string; amount: number; category: string; transaction_date: string }>
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const totalOfferings = ((offerResult.data || []) as Array<{ amount: number }>).reduce((s, o) => s + o.amount, 0)

        // Group by category
        const byCategory: Record<string, number> = {}
        for (const t of transactions) {
          if (!byCategory[t.category]) byCategory[t.category] = 0
          byCategory[t.category] += t.amount
        }

        return JSON.stringify({
          period: { start: startDate, end: endDate },
          total_income: totalIncome,
          total_expenses: totalExpense,
          net: totalIncome - totalExpense,
          total_offerings: totalOfferings,
          by_category: byCategory,
          transaction_count: transactions.length,
        })
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return JSON.stringify({ error: msg })
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(userRole: string, churchId: string) {
  const today = new Date().toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'long', day: 'numeric' })
  return `You are ChurchAI, an intelligent accounting assistant for a church finance management system.
Today is ${today}.
Current church ID: ${churchId}
User role: ${userRole}

Your capabilities:
- READ financial data: transactions, offerings, funds, members, bills, advances
- WRITE (treasurer/admin only): create transactions, offerings, members, bills
- DELETE (admin only): delete transactions
- GENERATE reports: income/expense, offering summaries, fund balances

Currency: BDT (Bangladeshi Taka). Format amounts as "৳X,XXX" or "BDT X,XXX".
Always be helpful, precise, and professional. 
When users ask to create/modify data, confirm the action before showing results.
For reports, present data in a clear, organized table or summary format.
If a user doesn't have permission for an action, politely explain their role limitations.
Keep responses concise but complete.`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Fast-fail if the service isn't configured on the server.
    let groq: Groq
    try {
      groq = getGroq()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI chat is not configured.'
      return NextResponse.json({ error: message }, { status: 503 })
    }

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit check (after auth so we have the user id)
    const rl = checkRateLimit(user.id)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetMs / 1000)}s.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    const body = await request.json()
    // NOTE: body.userRole is accepted for backward compat but IGNORED.
    // Role is derived server-side from user_church_roles to prevent privilege escalation.
    const { messages, churchId } = body as {
      messages: Groq.Chat.ChatCompletionMessageParam[]
      churchId: string
    }

    if (!churchId) {
      return NextResponse.json({ error: 'Church context required' }, { status: 400 })
    }

    // Look up the user's active role for this church from the DB.
    const { data: userChurchRoles, error: rolesLookupError } = await safeSelect(supabase, 'user_church_roles', {
      filter: { column: 'user_id', value: user.id },
    })
    if (rolesLookupError) {
      return NextResponse.json({ error: 'Failed to verify church access' }, { status: 500 })
    }

    const activeRoles = (userChurchRoles || []).filter(
      (r) => r.is_active && r.church_id === churchId,
    )

    // Resolve role_id -> role.name lookup (may fail if `roles` is RLS-blocked;
    // we fall back gracefully).
    let rolesMap = new Map<string, { name: string | null }>()
    const { data: rolesData } = await safeSelect(supabase, 'roles')
    if (rolesData) {
      rolesMap = new Map(
        (rolesData as Array<{ id: string; name: string | null }>).map((r) => [r.id, { name: r.name }]),
      )
    }

    // Global super_admin via user_metadata is a legacy fallback used by seeded
    // demo accounts (admin@church.com). Do NOT trust body-supplied role.
    const metaRole = (user.user_metadata?.role as string | undefined)?.toLowerCase() || ''
    const isGlobalAdmin = metaRole === 'admin' || metaRole === 'super_admin'

    // Derive the effective role for permission gating.
    let effectiveRole: 'viewer' | 'treasurer' | 'admin' = 'viewer'
    if (isGlobalAdmin) {
      effectiveRole = 'admin'
    } else if (activeRoles.length > 0) {
      // Prefer the highest-privilege role if multiple are assigned.
      const priority = { admin: 3, treasurer: 2, viewer: 1 } as const
      for (const r of activeRoles) {
        const canonical = canonicalizeRole(r.role_id ? rolesMap.get(r.role_id)?.name : null)
        if (priority[canonical] > priority[effectiveRole]) {
          effectiveRole = canonical
        }
      }
    } else {
      // No active role for this church and not a global admin.
      return NextResponse.json({ error: 'Access to this church denied' }, { status: 403 })
    }

    const systemMessage: Groq.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: buildSystemPrompt(effectiveRole, churchId),
    }

    const allMessages: Groq.Chat.ChatCompletionMessageParam[] = [systemMessage, ...messages]

    // Agentic loop — allow up to 5 tool-call rounds, then stream the final reply
    let currentMessages = allMessages
    let finalContent = ''

    for (let round = 0; round < 5; round++) {
      // Use streaming only on the last round (or when no tools are called)
      // For tool-call rounds we need the full response to parse tool calls.
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: currentMessages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1024,
        stream: false,
      })

      const choice = completion.choices[0]
      const assistantMessage = choice.message

      if (!choice.finish_reason || choice.finish_reason === 'stop' || !assistantMessage.tool_calls?.length) {
        // No more tool calls — capture content and break; we stream it below.
        finalContent = assistantMessage.content || ''
        break
      }

      // Execute all tool calls
      const toolResults: Groq.Chat.ChatCompletionToolMessageParam[] = []
      for (const toolCall of assistantMessage.tool_calls) {
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}')
        const result = await executeTool(toolCall.function.name, toolArgs, churchId, effectiveRole)
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      currentMessages = [
        ...currentMessages,
        assistantMessage as Groq.Chat.ChatCompletionMessageParam,
        ...toolResults,
      ]
    }

    // ── Stream the final answer ──────────────────────────────────────────────
    // If finalContent is already resolved (common case after tool rounds),
    // stream it token-by-token using Groq streaming so the UI gets progressive
    // output.  We start a new streaming completion seeded with the resolved
    // conversation so the model just finishes its answer.
    if (finalContent) {
      // Content already available — wrap in a streaming response for consistent
      // client-side handling.
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          // Split into ~40-char chunks to simulate streaming feel
          const chunkSize = 40
          let i = 0
          const tick = () => {
            if (i >= finalContent.length) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
              controller.close()
              return
            }
            const chunk = finalContent.slice(i, i + chunkSize)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`))
            i += chunkSize
            // Use setImmediate-style scheduling via Promise microtask
            Promise.resolve().then(tick)
          }
          tick()
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      })
    }

    // Fallback: stream directly from Groq (no tool calls were made)
    const groqStream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: currentMessages,
      temperature: 0.2,
      max_tokens: 1024,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const delta = chunk.choices[0]?.delta?.content || ''
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
            }
            if (chunk.choices[0]?.finish_reason === 'stop') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    })
  } catch (err) {
    console.error('AI chat error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
