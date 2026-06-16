import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { acceptInvitation } from '@/lib/invitations'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized - please sign in first' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const result = await acceptInvitation(supabase as never, token, user.id, user.email)

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to accept invitation' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      churchId: result.churchId,
      churchName: result.churchName,
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
