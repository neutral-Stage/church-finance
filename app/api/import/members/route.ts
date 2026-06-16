import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { requireChurchAccess } from '@/lib/permission-helpers'
import { parseSpreadsheetBuffer, pickField } from '@/lib/import/csv'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MEMBER_FIELD_MAP = {
  name: ['name', 'full_name', 'member_name', 'member'],
  phone: ['phone', 'mobile', 'telephone', 'phone_number'],
  fellowship_name: ['fellowship_name', 'fellowship', 'group', 'small_group'],
  job: ['job', 'occupation', 'profession'],
  location: ['location', 'address', 'city'],
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    const formData = await request.formData()
    const file = formData.get('file')
    const churchId = formData.get('church_id')
    const mode = formData.get('mode') ?? 'staging'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV or Excel file is required' }, { status: 400 })
    }

    if (!churchId || typeof churchId !== 'string') {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    const authCheck = await requireChurchAccess(supabase as never, churchId)
    if (!authCheck.authorized || !authCheck.userId) {
      const status = authCheck.error === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const rate = checkRateLimit(`import:members:${authCheck.userId}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterMs)
    }

    const buffer = await file.arrayBuffer()
    const { rows } = parseSpreadsheetBuffer(buffer)

    const members = rows
      .map((row) => ({
        name: pickField(row, MEMBER_FIELD_MAP.name),
        phone: pickField(row, MEMBER_FIELD_MAP.phone) || null,
        fellowship_name: pickField(row, MEMBER_FIELD_MAP.fellowship_name) || null,
        job: pickField(row, MEMBER_FIELD_MAP.job) || null,
        location: pickField(row, MEMBER_FIELD_MAP.location) || null,
        church_id: churchId,
        raw: row,
      }))
      .filter((member) => member.name)

    if (members.length === 0) {
      return NextResponse.json({ error: 'No valid member rows with names were found' }, { status: 400 })
    }

    if (mode === 'direct') {
      const inserts = members.map(({ name, phone, fellowship_name, job, location, church_id }) => ({
        name,
        phone,
        fellowship_name,
        job,
        location,
        church_id,
        created_at: new Date().toISOString(),
      }))

      const { data, error } = await (adminSupabase.from('members') as any)
        .insert(inserts)
        .select('id, name')

      if (error) {
        console.error('Member bulk insert error:', error)
        return NextResponse.json({ error: 'Failed to import members' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        imported: data?.length ?? inserts.length,
        members: data,
      })
    }

    const stagingRows = members.map((member) => ({
      church_id: churchId,
      user_id: authCheck.userId,
      import_type: 'member' as const,
      row_data: member.raw,
      parsed_amount: null,
      parsed_date: null,
      parsed_description: member.name,
      status: 'pending' as const,
    }))

    const { data, error } = await (adminSupabase.from('import_staging') as any)
      .insert(stagingRows)
      .select('id')

    if (error) {
      console.error('Member staging error:', error)
      return NextResponse.json({ error: 'Failed to stage member import' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: data?.length ?? stagingRows.length,
      skipped: rows.length - members.length,
      message: `${data?.length ?? stagingRows.length} members staged for review`,
    })
  } catch (error) {
    console.error('Member import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
