import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
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
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Server-side client for user authentication with cookies
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
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
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


// Auth helpers - Use server-side authentication for proper cookie handling
export const signIn = async (email: string, password: string) => {
  try {
    // Make a request to our server-side auth endpoint
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      return { data: null, error: result.error || 'Authentication failed' }
    }
    
    if (!result.success) {
      return { data: null, error: result.error || 'Authentication failed' }
    }
    
    return { data: { user: result.user }, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { data: null, error: 'Network error during authentication' }
  }
}

export const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export const signOut = async () => {
  try {
    // Make a request to our server-side auth endpoint for proper cookie cleanup
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (!response.ok) {
      return { error: result.error || 'Sign out failed' }
    }
    
    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error: 'Network error during sign out' }
  }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const getSession = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { session: user ? { user } : null, error }
}