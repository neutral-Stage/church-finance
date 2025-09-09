import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  console.log('\n=== NEW SIGNIN ATTEMPT ===')
  console.log('Request URL:', request.url)
  
  try {
    const { email, password } = await request.json()
    console.log('Login attempt for email:', email)

    if (!email || !password) {
      console.log('Missing credentials')
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use the server client for authentication
    console.log('Attempting Supabase authentication...')
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Supabase authentication error:', error.message)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }

    if (!data.user || !data.session) {
      console.error('No user or session returned from Supabase')
      return NextResponse.json(
        { success: false, error: 'Authentication failed - no user data' },
        { status: 401 }
      )
    }

    console.log('Supabase authentication successful for:', data.user.email)
    console.log('Session expires at:', data.session.expires_at ? new Date(data.session.expires_at * 1000) : 'Unknown')
    
    // Fetch user role from database to include in response
    let userRole = 'viewer' // fallback
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single()

      if (userError) {
        console.error('Error fetching user role during signin:', userError.message)
      } else if (userData) {
        userRole = userData.role
        console.log('User role fetched during signin:', userRole)
      }
    } catch (error) {
      console.error('Exception fetching user role during signin:', error)
    }
    
    // Create a minimal authentication cookie with only essential data
    const minimalAuthData = {
      user_id: data.user.id,
      email: data.user.email,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
    
    console.log('Creating minimal auth cookie')
    
    // Set only our minimal custom cookie - no Supabase SSR cookies
    const response = NextResponse.json({
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
        user_metadata: data.user.user_metadata
      }
    })

    response.cookies.set('church-auth-minimal', JSON.stringify(minimalAuthData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.session.expires_in || 3600 // Use session expiry or 1 hour
    })

    console.log('Minimal auth cookie set successfully')
    console.log('=== SIGNIN RESPONSE COMPLETE ===\n')
    return response

  } catch (error) {
    console.error('Signin route error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}