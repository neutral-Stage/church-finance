import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import type { Json } from '@/types/database'

export const dynamic = 'force-dynamic'

interface StagingRow {
  id: string
  church_id: string
  import_type: string
  row_data: Json
  parsed_amount: number | null
  parsed_date: string | null
  parsed_description: string | null
  matched_entity_id: string | null
  status: string
  created_at: string
}

import { findReconciliationMatches } from '@/lib/reconciliation-match'

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
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const [{ data: staging, error: stagingError }, { data: transactions, error: txError }] =
      await Promise.all([
        supabase
          .from('import_staging')
          .select('*')
          .eq('church_id', churchId)
          .eq('import_type', 'transaction')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('id, amount, description, transaction_date, type, category, fund_id')
          .eq('church_id', churchId)
          .order('transaction_date', { ascending: false })
          .limit(500),
      ])

    if (stagingError || txError) {
      return NextResponse.json({ error: 'Failed to load reconciliation data' }, { status: 500 })
    }

    const ledger = transactions ?? []
    const unmatched = (staging ?? []).map((row) => {
      const suggestions = findReconciliationMatches(row, ledger, 5)

      return {
        ...row,
        suggestions,
      }
    })

    return NextResponse.json({
      success: true,
      unmatched,
      ledgerCount: ledger.length,
      pendingCount: unmatched.length,
    })
  } catch (error) {
    console.error('Reconciliation GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { staging_id, church_id, action, transaction_id, fund_id } = body

    if (!staging_id || !church_id || !action) {
      return NextResponse.json(
        { error: 'staging_id, church_id, and action are required' },
        { status: 400 }
      )
    }

    const authCheck = await requireChurchAccess(supabase as never, church_id)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const { data: stagingRow, error: fetchError } = await supabase
      .from('import_staging')
      .select('*')
      .eq('id', staging_id)
      .eq('church_id', church_id)
      .single()

    if (fetchError || !stagingRow) {
      return NextResponse.json({ error: 'Staging row not found' }, { status: 404 })
    }

    const rowData =
      stagingRow.row_data && typeof stagingRow.row_data === 'object' && !Array.isArray(stagingRow.row_data)
        ? (stagingRow.row_data as Record<string, unknown>)
        : {}

    if (action === 'skip') {
      await (adminSupabase.from('import_staging') as any)
        .update({ status: 'skipped' })
        .eq('id', staging_id)

      return NextResponse.json({ success: true, status: 'skipped' })
    }

    if (action === 'match') {
      if (!transaction_id) {
        return NextResponse.json({ error: 'transaction_id is required to match' }, { status: 400 })
      }

      await (adminSupabase.from('import_staging') as any)
        .update({
          status: 'matched',
          matched_entity_id: transaction_id,
          matched_at: new Date().toISOString(),
        })
        .eq('id', staging_id)

      return NextResponse.json({ success: true, status: 'matched', transaction_id })
    }

    if (action === 'import') {
      if (!fund_id) {
        return NextResponse.json({ error: 'fund_id is required to import' }, { status: 400 })
      }

      const inferredType = String(rowData.inferred_type ?? 'expense')
      const amount = (stagingRow as StagingRow).parsed_amount
      if (amount === null) {
        return NextResponse.json({ error: 'Staging row has no amount' }, { status: 400 })
      }

      const { data: created, error: createError } = await (adminSupabase
        .from('transactions') as any)
        .insert({
          church_id,
          fund_id,
          amount,
          type: inferredType === 'income' ? 'income' : 'expense',
          description: (stagingRow as StagingRow).parsed_description ?? 'Imported transaction',
          category: String(rowData.inferred_category ?? 'Other'),
          payment_method: String(rowData.inferred_payment_method ?? 'bank'),
          transaction_date:
            (stagingRow as StagingRow).parsed_date ?? new Date().toISOString().split('T')[0],
          receipt_number: rowData.inferred_receipt_number
            ? String(rowData.inferred_receipt_number)
            : null,
          created_by: authCheck.userId,
        })
        .select('id')
        .single()

      if (createError || !created) {
        return NextResponse.json({ error: 'Failed to create transaction from import' }, { status: 500 })
      }

      await (adminSupabase.from('import_staging') as any)
        .update({
          status: 'imported',
          matched_entity_id: created.id,
          matched_at: new Date().toISOString(),
        })
        .eq('id', staging_id)

      return NextResponse.json({ success: true, status: 'imported', transaction_id: created.id })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Reconciliation PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
