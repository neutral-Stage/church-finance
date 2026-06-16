import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { requireAdminAccess } from '@/lib/permission-helpers'
import { parsePaginationParams, buildPaginatedResponse, decodeCursor } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const authCheck = await requireAdminAccess(supabase as never)
    if (!authCheck.authorized) {
      const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
    }

    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')
    const entityType = searchParams.get('entity_type')
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const pagination = parsePaginationParams(searchParams, { defaultLimit: 100, maxLimit: 500 })

    let query = supabase
      .from('audit_log')
      .select('*', { count: pagination.mode === 'offset' ? 'exact' : undefined })
      .order('created_at', { ascending: false })

    if (churchId) query = query.eq('church_id', churchId)
    if (entityType) query = query.eq('entity_type', entityType)
    if (action) query = query.eq('action', action)
    if (userId) query = query.eq('user_id', userId)

    if (pagination.mode === 'cursor' && pagination.cursor) {
      const cursorValue = decodeCursor(pagination.cursor)
      if (cursorValue) {
        query = query.lt('created_at', cursorValue)
      }
    }

    if (pagination.mode === 'offset') {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)
    } else {
      query = query.limit(pagination.limit)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Audit log fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
    }

    const paginated = buildPaginatedResponse(data ?? [], pagination, count ?? undefined)

    return NextResponse.json({
      success: true,
      entries: paginated.data,
      pagination: paginated.pagination,
    })
  } catch (error) {
    console.error('Audit API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
