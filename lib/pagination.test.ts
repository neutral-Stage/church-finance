import { describe, expect, it } from 'vitest'
import { parsePaginationParams, buildPaginatedResponse, encodeCursor, decodeCursor } from '@/lib/pagination'

describe('pagination', () => {
  it('parses offset pagination params', () => {
    const params = new URLSearchParams('page=2&limit=25')
    const result = parsePaginationParams(params)
    expect(result.mode).toBe('offset')
    expect(result.page).toBe(2)
    expect(result.limit).toBe(25)
    expect(result.offset).toBe(25)
  })

  it('parses cursor pagination params', () => {
    const params = new URLSearchParams('cursor=abc&limit=10')
    const result = parsePaginationParams(params)
    expect(result.mode).toBe('cursor')
    expect(result.cursor).toBe('abc')
  })

  it('builds paginated response with next cursor', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=2'))
    const result = buildPaginatedResponse(
      [
        { id: '1', created_at: '2025-06-02T00:00:00Z' },
        { id: '2', created_at: '2025-06-01T00:00:00Z' },
      ],
      params,
      10
    )

    expect(result.pagination.hasMore).toBe(true)
    expect(result.pagination.nextCursor).toBeTruthy()
    expect(decodeCursor(result.pagination.nextCursor!)).toBe('2025-06-01T00:00:00Z')
  })

  it('round-trips cursor encoding', () => {
    const encoded = encodeCursor('2025-06-01T00:00:00Z')
    expect(decodeCursor(encoded)).toBe('2025-06-01T00:00:00Z')
  })
})
