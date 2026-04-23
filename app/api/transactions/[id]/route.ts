import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'
import type { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// Resolve the caller's effective role for the church that owns the given
// transaction. Returns { userId, churchId, role } or an error status when the
// user is unauthenticated or has no access to this transaction's church.
async function authorizeTransaction(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  transactionId: string,
): Promise<
  | { ok: true; userId: string; churchId: string; role: 'viewer' | 'treasurer' | 'admin' }
  | { ok: false; status: number; error: string }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: 'Unauthorized' }

  // Read the transaction through the user-authenticated client — RLS ensures
  // the user can only see transactions in churches they have access to.
  // Cast to any because the generated `transactions` type is stale and does
  // not include `church_id` even though the live DB schema has it (see
  // migrations 20250918_fix_architectural_issues.sql).
  const txResult: any = await supabase
    .from('transactions')
    .select('id, church_id')
    .eq('id', transactionId)
    .single()
  const tx = txResult.data as { id: string; church_id: string | null } | null
  const txError = txResult.error

  if (txError || !tx) {
    return { ok: false, status: 404, error: 'Transaction not found' }
  }

  // Look up the caller's role for the church that owns the transaction.
  const { data: userChurchRoles } = await safeSelect(supabase, 'user_church_roles', {
    filter: { column: 'user_id', value: user.id },
  })
  const { data: rolesData } = await safeSelect(supabase, 'roles')
  const rolesMap = new Map<string, { name: string | null }>(
    (rolesData || []).map((r) => [r.id, { name: r.name }]),
  )

  const active = (userChurchRoles || []).filter(
    (r) => r.is_active && r.church_id === tx.church_id,
  )

  // Global admin fallback via user_metadata (legacy demo-account pattern).
  const metaRole = (user.user_metadata?.role as string | undefined)?.toLowerCase() || ''
  let role: 'viewer' | 'treasurer' | 'admin' =
    metaRole === 'admin' || metaRole === 'super_admin' ? 'admin' : 'viewer'

  const priority = { admin: 3, treasurer: 2, viewer: 1 } as const
  for (const r of active) {
    const name = (r.role_id ? rolesMap.get(r.role_id)?.name : null)?.toLowerCase() || ''
    const canonical =
      name === 'super_admin' || name === 'church_admin' || name === 'admin'
        ? 'admin'
        : name === 'treasurer'
          ? 'treasurer'
          : 'viewer'
    if (priority[canonical] > priority[role]) role = canonical
  }

  return { ok: true, userId: user.id, churchId: tx.church_id!, role }
}

// PUT /api/transactions/[id] - Update a transaction (treasurer/admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient()
    const authz = await authorizeTransaction(supabase, params.id)
    if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
    if (authz.role === 'viewer') {
      return NextResponse.json(
        { error: 'Insufficient permissions (treasurer or admin required)' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const transactionData: TransactionUpdate = {
      type: body.type,
      amount: body.amount,
      description: body.description,
      fund_id: body.fund_id,
      category: body.category,
      payment_method: body.payment_method,
      transaction_date: body.transaction_date,
      receipt_number: body.receipt_number || null,
    }

    const { data: transaction, error: updateError } = await (supabase
      .from('transactions') as any)
      .update(transactionData)
      .eq('id', params.id)
      .eq('church_id', authz.churchId) // defense in depth
      .select()
      .single()

    if (updateError) {
      console.error('Transaction update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update transaction', details: updateError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id] - Delete a transaction (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerClient()
    const authz = await authorizeTransaction(supabase, params.id)
    if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
    if (authz.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions (admin required)' },
        { status: 403 },
      )
    }

    // Cast via any for the same stale-type reason as the SELECT above.
    const { data, error: deleteError } = await (supabase.from('transactions') as any)
      .delete()
      .eq('id', params.id)
      .eq('church_id', authz.churchId) // defense in depth
      .select('id')

    if (deleteError) {
      console.error('Transaction delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete transaction', details: deleteError.message },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or you lack permission to delete it' },
        { status: 404 },
      )
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
