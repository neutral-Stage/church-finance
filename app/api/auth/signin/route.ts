import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect } from '@/lib/supabase-helpers'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = checkRateLimit(`auth:signin:${ip}`, { limit: 10, windowMs: 60_000 })
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterMs)
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 })
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed - no user data' },
        { status: 401 }
      )
    }

    let userRole = 'viewer'
    try {
      const userDataResult = await safeSelect(supabase, 'users', {
        columns: 'role, full_name',
        filter: { column: 'id', value: data.user.id },
      })

      if (!userDataResult.error && userDataResult.data && userDataResult.data.length > 0) {
        userRole = userDataResult.data[0].role || 'viewer'
      }
    } catch {
      // Keep fallback role
    }

    const minimalAuthData = {
      user_id: data.user.id,
      email: data.user.email,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
        user_metadata: data.user.user_metadata,
      },
    })

    response.cookies.set('church-auth-minimal', JSON.stringify(minimalAuthData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.session.expires_in || 3600,
    })

    return response
  } catch (error) {
    console.error('Signin route error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
