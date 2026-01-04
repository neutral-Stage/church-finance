import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side client for user authentication with cookies (no realtime)
export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  const supabaseClient = createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
              })
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Could not set cookies in server component:', error)
          }
        },
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000), // 30 second timeout
          })
        }
      },
      db: {
        schema: 'public'
      }
    }
  )

  // Check for custom auth cookie logic removed as @supabase/ssr handles this automatically

  return supabaseClient
}

// Server-side client for admin operations (no realtime)
export const createAdminClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }

  return createSSRServerClient<Database>(supabaseUrl, supabaseServiceKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for admin client
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        })
      }
    },
    db: {
      schema: 'public'
    }
  })
}

// API Route client for handling cookies from request/response
export const createApiRouteClient = async (request: NextRequest) => {
  const supabaseClient = createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookieStore = request.cookies
          return cookieStore.getAll()
        },
        setAll() {
          // For API routes, we don't set cookies in the response here
          // as it's handled differently
        },
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000), // 30 second timeout
          })
        }
      },
      db: {
        schema: 'public'
      }
    }
  )

  // Check for custom auth cookie logic removed as @supabase/ssr handles this automatically

  return supabaseClient
}