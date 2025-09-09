import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'

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

  // Check for custom auth cookie if no standard user exists
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) {
    const authCookie = cookieStore.get(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(decodeURIComponent(authCookie.value))
        if (authData.access_token && authData.expires_at > Math.floor(Date.now() / 1000)) {
          // Set the session manually
          await supabaseClient.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          })
        }
      } catch (error) {
        console.warn('Error parsing custom auth cookie:', error)
      }
    }
  }

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
        setAll(cookiesToSet) {
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

  // Check for custom auth cookie if no standard user exists
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) {
    const authCookie = request.cookies.get(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(decodeURIComponent(authCookie.value))
        if (authData.access_token && authData.expires_at > Math.floor(Date.now() / 1000)) {
          // Set the session manually
          await supabaseClient.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          })
        }
      } catch (error) {
        console.warn('Error parsing custom auth cookie in API route:', error)
      }
    }
  }

  return supabaseClient
}