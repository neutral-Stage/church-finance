export interface PaginationParams {
  page: number
  limit: number
  cursor?: string
  offset: number
  mode: 'offset' | 'cursor'
}

export interface PaginationMeta {
  page?: number
  limit: number
  total?: number
  totalPages?: number
  hasMore: boolean
  nextCursor?: string | null
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

export function parsePaginationParams(
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT
  const maxLimit = options?.maxLimit ?? MAX_LIMIT
  const cursor = searchParams.get('cursor') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const rawLimit = parseInt(searchParams.get('limit') ?? String(defaultLimit), 10)
  const limit = Math.min(Math.max(1, rawLimit || defaultLimit), maxLimit)

  if (cursor) {
    return { page, limit, cursor, offset: 0, mode: 'cursor' }
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    mode: 'offset',
  }
}

export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export function buildPaginatedResponse<T extends { id?: string; created_at?: string | null }>(
  data: T[],
  params: PaginationParams,
  total?: number
): PaginatedResult<T> {
  const hasMore =
    params.mode === 'cursor'
      ? data.length === params.limit
      : total !== undefined
        ? params.offset + data.length < total
        : data.length === params.limit

  const lastItem = data[data.length - 1]
  const nextCursor =
    hasMore && lastItem?.created_at
      ? encodeCursor(lastItem.created_at)
      : hasMore && lastItem?.id
        ? encodeCursor(lastItem.id)
        : null

  const pagination: PaginationMeta = {
    limit: params.limit,
    hasMore,
    nextCursor: hasMore ? nextCursor : null,
  }

  if (params.mode === 'offset') {
    pagination.page = params.page
    if (total !== undefined) {
      pagination.total = total
      pagination.totalPages = Math.ceil(total / params.limit)
    }
  }

  return { data, pagination }
}
