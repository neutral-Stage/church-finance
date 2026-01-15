import { createServerClient as createSSRServerClient, CookieOptions } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
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
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
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
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000),
          })
        }
      },
      db: {
        schema: 'public'
      }
    }
  )

  return supabaseClient
}

// Server-side client for admin operations (bypasses RLS with service role)
export const createAdminClient = (): SupabaseClient<Database> => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }

  console.log('[AdminClient] Creating admin client with service role key...')

  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        // Explicitly set the Authorization header with service role key
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000),
        })
      }
    },
    db: {
      schema: 'public'
    }
  })

  console.log('[AdminClient] Admin client created successfully')
  return client
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
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000),
          })
        }
      },
      db: {
        schema: 'public'
      }
    }
  )

  return supabaseClient
}