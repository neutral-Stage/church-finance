import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { pickField } from '@/lib/import/csv'
import {
  parseBankImportFile,
  normalizeBankRow,
  BANK_IMPORT_FIELD_MAP,
} from '@/lib/import/ofx-qbo'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    const formData = await request.formData()
    const file = formData.get('file')
    const churchId = formData.get('church_id')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV, Excel, OFX, or QBO file is required' }, { status: 400 })
    }

    if (!churchId || typeof churchId !== 'string') {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const authCheck = await requireChurchAccess(supabase as never, churchId)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const rate = checkRateLimit(`import:transactions:${authCheck.userId}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterMs)
    }

    const buffer = await file.arrayBuffer()
    const { format, rows } = parseBankImportFile(file.name, buffer)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows found in file' }, { status: 400 })
    }

    const stagingRows = rows
      .map((row) => {
        const { amount, type, description, parsedDate } = normalizeBankRow(row)

        return {
          church_id: churchId,
          user_id: authCheck.userId,
          import_type: 'transaction' as const,
          row_data: {
            ...row,
            source_format: format,
            inferred_type: type,
            inferred_category: pickField(row, BANK_IMPORT_FIELD_MAP.category) || 'Other',
            inferred_payment_method: 'bank',
            inferred_receipt_number: null,
          },
          parsed_amount: amount,
          parsed_date: parsedDate,
          parsed_description: description,
          status: 'pending' as const,
        }
      })
      .filter((row) => row.parsed_amount !== null)

    if (stagingRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid transaction rows with amounts were found' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminSupabase.from('import_staging') as any)
      .insert(stagingRows)
      .select('id')

    if (error) {
      console.error('Import staging error:', error)
      return NextResponse.json({ error: 'Failed to stage import rows' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      format,
      imported: data?.length ?? stagingRows.length,
      skipped: rows.length - stagingRows.length,
      message: `${data?.length ?? stagingRows.length} transactions staged for reconciliation`,
    })
  } catch (error) {
    console.error('Transaction import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
