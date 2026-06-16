import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export type ApprovalEntityType = 'bill' | 'ledger_entry' | 'advance'

export interface ApprovalItem {
  id: string
  entity_type: ApprovalEntityType
  title: string
  description: string | null
  amount: number | null
  submitted_at: string | null
  metadata?: Record<string, unknown>
}

function isPendingApproval(
  approvalStatus: string | null | undefined,
  fallbackPending = false
): boolean {
  if (approvalStatus === 'pending') return true
  if (approvalStatus === 'approved' || approvalStatus === 'rejected') return false
  return fallbackPending
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const authCheck = await requireChurchAccess(supabase as never, churchId)
    if (!authCheck.authorized) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const [billsResult, ledgerResult, advancesResult] = await Promise.all([
      supabase
        .from('bills')
        .select('id, vendor_name, amount, due_date, approval_status, status, created_at, notes')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false }),
      supabase
        .from('ledger_entries')
        .select('id, title, description, total_amount, approval_status, created_at, notes')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false }),
      supabase
        .from('advances')
        .select('id, recipient_name, purpose, amount, status, created_at, notes')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false }),
    ])

    if (billsResult.error || ledgerResult.error || advancesResult.error) {
      console.error('Approvals GET error:', billsResult.error ?? ledgerResult.error ?? advancesResult.error)
      return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 })
    }

    const items: ApprovalItem[] = []

    for (const bill of billsResult.data ?? []) {
      if (!isPendingApproval(bill.approval_status, bill.status === 'pending')) continue
      items.push({
        id: bill.id,
        entity_type: 'bill',
        title: bill.vendor_name,
        description: bill.notes,
        amount: Number(bill.amount),
        submitted_at: bill.created_at,
        metadata: { due_date: bill.due_date, status: bill.status },
      })
    }

    for (const entry of ledgerResult.data ?? []) {
      if (!isPendingApproval(entry.approval_status, true)) continue
      items.push({
        id: entry.id,
        entity_type: 'ledger_entry',
        title: entry.title,
        description: entry.description ?? entry.notes,
        amount: entry.total_amount != null ? Number(entry.total_amount) : null,
        submitted_at: entry.created_at,
      })
    }

    for (const advance of advancesResult.data ?? []) {
      if (advance.status !== 'pending') continue
      items.push({
        id: advance.id,
        entity_type: 'advance',
        title: advance.recipient_name,
        description: advance.purpose ?? advance.notes,
        amount: Number(advance.amount),
        submitted_at: advance.created_at,
      })
    }

    items.sort((a, b) => {
      const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
      const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json({ success: true, items, count: items.length })
  } catch (error) {
    console.error('Approvals API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()

    const {
      action,
      entity_type: entityType,
      id,
      church_id: churchId,
      notes,
    } = body as {
      action?: 'approve' | 'reject'
      entity_type?: ApprovalEntityType
      id?: string
      church_id?: string
      notes?: string
    }

    if (!action || !entityType || !id || !churchId) {
      return NextResponse.json(
        { error: 'action, entity_type, id, and church_id are required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const authCheck = await requireChurchAccess(supabase as never, churchId)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const now = new Date().toISOString()
    const userId = authCheck.userId

    if (entityType === 'bill') {
      const { data: existing, error: fetchError } = await adminSupabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .eq('church_id', churchId)
        .single()

      if (fetchError || !existing) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
      }

      const approvalStatus = action === 'approve' ? 'approved' : 'rejected'
      const updatePayload: Record<string, unknown> = {
        approval_status: approvalStatus,
        approved_at: now,
        approved_by: userId,
        updated_at: now,
      }
      if (action === 'approve') {
        updatePayload.status = 'approved'
      }

      const { error: updateError } = await adminSupabase
        .from('bills')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
      }

      await logAuditEvent(adminSupabase, {
        churchId,
        userId,
        action: 'update',
        entityType: 'bill',
        entityId: id,
        oldData: existing as Record<string, unknown>,
        newData: { ...updatePayload, review_notes: notes ?? null },
      })
    } else if (entityType === 'ledger_entry') {
      const { data: existing, error: fetchError } = await adminSupabase
        .from('ledger_entries')
        .select('*')
        .eq('id', id)
        .eq('church_id', churchId)
        .single()

      if (fetchError || !existing) {
        return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 })
      }

      const approvalStatus = action === 'approve' ? 'approved' : 'rejected'
      const updatePayload = {
        approval_status: approvalStatus,
        approved_at: now,
        approved_by: userId,
        updated_at: now,
        status: action === 'approve' ? 'active' : (existing as { status?: string }).status,
      }

      const { error: updateError } = await adminSupabase
        .from('ledger_entries')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update ledger entry' }, { status: 500 })
      }

      await logAuditEvent(adminSupabase, {
        churchId,
        userId,
        action: 'update',
        entityType: 'ledger_entry',
        entityId: id,
        oldData: existing as Record<string, unknown>,
        newData: { ...updatePayload, review_notes: notes ?? null },
      })
    } else if (entityType === 'advance') {
      const { data: existing, error: fetchError } = await adminSupabase
        .from('advances')
        .select('*')
        .eq('id', id)
        .eq('church_id', churchId)
        .single()

      if (fetchError || !existing) {
        return NextResponse.json({ error: 'Advance not found' }, { status: 404 })
      }

      const updatePayload = {
        status: action === 'approve' ? 'outstanding' : 'rejected',
        approved_by: userId,
        notes: notes
          ? `${(existing as { notes?: string }).notes ?? ''}\n\nReview: ${notes}`.trim()
          : (existing as { notes?: string }).notes,
      }

      const { error: updateError } = await adminSupabase
        .from('advances')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update advance' }, { status: 500 })
      }

      await logAuditEvent(adminSupabase, {
        churchId,
        userId,
        action: 'update',
        entityType: 'advance',
        entityId: id,
        oldData: existing as Record<string, unknown>,
        newData: updatePayload as Record<string, unknown>,
      })
    } else {
      return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      entity_type: entityType,
      id,
    })
  } catch (error) {
    console.error('Approvals API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
