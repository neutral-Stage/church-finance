import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { NextRequest } from 'next/server'
import { isDemoMode } from '@/lib/demo/config'

function getPublicSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (url && key) return { url, key }
  if (isDemoMode()) {
    return {
      url: 'https://demo.invalid.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    }
  }
  throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)')
}

// Server-side client for user authentication with cookies (no realtime)
export const createServerClient = async () => {
  const { url: supabaseUrl, key: supabasePublishableKey } = getPublicSupabaseEnv()
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  const supabaseClient = createSSRServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...(options as object),
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              })
            })
          } catch (error) {
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
        },
      },
      db: {
        schema: 'public',
      },
    }
  )

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()
  if (!user) {
    const host = supabaseUrl.split('//')[1]?.split('.')[0] || 'demo'
    const authCookie = cookieStore.get(`sb-${host}-auth-token`)
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(decodeURIComponent(authCookie.value))
        if (authData.access_token && authData.expires_at > Math.floor(Date.now() / 1000)) {
          await supabaseClient.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
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
  if (isDemoMode()) {
    throw new Error('Admin Supabase client is not available in demo mode (use mock APIs).')
  }
  const { url: supabaseUrl } = getPublicSupabaseEnv()
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseSecretKey) {
    throw new Error('Missing Supabase secret key')
  }

  return createSSRServerClient<Database>(supabaseUrl, supabaseSecretKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000),
        })
      },
    },
    db: {
      schema: 'public',
    },
  })
}

// API Route client for handling cookies from request/response
export const createApiRouteClient = async (request: NextRequest) => {
  const { url: supabaseUrl, key: supabasePublishableKey } = getPublicSupabaseEnv()
  const supabaseClient = createSSRServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {},
    },
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000),
        })
      },
    },
    db: {
      schema: 'public',
    },
  })

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()
  if (!user) {
    const host = supabaseUrl.split('//')[1]?.split('.')[0] || 'demo'
    const authCookie = request.cookies.get(`sb-${host}-auth-token`)
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(decodeURIComponent(authCookie.value))
        if (authData.access_token && authData.expires_at > Math.floor(Date.now() / 1000)) {
          await supabaseClient.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
          })
        }
      } catch (error) {
        console.warn('Error parsing custom auth cookie in API route:', error)
      }
    }
  }

  return supabaseClient
}
