import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use the server client for authentication which sets the standard cookies
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
      return NextResponse.json(
        { success: false, error: 'Authentication failed - no user data' },
        { status: 401 }
      )
    }

    // Fetch user role
    let userRole = 'viewer'
    try {
      const userDataResult = await safeSelect(supabase, "users", {
        columns: "role, full_name",
        filter: { column: "id", value: data.user.id }
      });

      if (userDataResult.data && userDataResult.data.length > 0) {
        userRole = userDataResult.data[0].role || 'viewer'
      }
    } catch (error) {
      console.error('Exception fetching user role:', error)
    }

    // We do NOT set any custom cookies. 
    // createServerClient in supabase-server.ts handles the standard supabase session cookies via next/headers

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
        user_metadata: data.user.user_metadata
      }
    })

  } catch (error) {
    console.error('Signin route error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}