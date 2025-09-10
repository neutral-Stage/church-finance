import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/auth/session - Get current server-side session for client sync
export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Get the current session from server
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to get session' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { session: null },
        { status: 200 }
      )
    }

    // Return session data for client synchronization
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user
      }
    })
  } catch (error) {
    console.error('Session sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}