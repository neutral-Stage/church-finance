import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
              })
            )
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data.session && data.user) {
        console.log('Auth callback: Session established for', data.user.email)
        
        // Create the same minimal auth cookie that we use in signin
        const minimalAuthData = {
          user_id: data.user.id,
          email: data.user.email,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
        
        response.cookies.set('church-auth-minimal', JSON.stringify(minimalAuthData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: data.session.expires_in || 3600
        })
        
        console.log('Auth callback: Minimal auth cookie set, redirecting to', next)
        return response
      }
    } catch (error) {
      console.error('Auth callback error:', error)
    }
  }

  // Return the user to the login page if something went wrong
  return NextResponse.redirect(`${origin}/auth/login`)
}