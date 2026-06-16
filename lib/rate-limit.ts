const buckets = new Map<string, { count: number; windowStart: number }>()

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

/**
 * Simple in-memory rate limiter for API routes.
 * Suitable for single-instance deployments; use Redis for multi-instance production.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  if (entry.count >= limit) {
    const retryAfterMs = windowMs - (now - entry.windowStart)
    return { allowed: false, remaining: 0, retryAfterMs }
  }

  entry.count += 1
  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function rateLimitResponse(retryAfterMs: number): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000)
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}
