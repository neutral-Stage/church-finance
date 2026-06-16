import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ServerNotificationService } from '@/lib/notifications/server'
import { requireAdminAccess } from '@/lib/permission-helpers'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['all', 'bills', 'transactions', 'offerings', 'advances'] as const
type GenerateType = (typeof VALID_TYPES)[number]

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.NOTIFICATIONS_CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      const supabase = await createServerClient()
      const authCheck = await requireAdminAccess(supabase as never)
      if (!authCheck.authorized) {
        const status = authCheck.error?.includes('Unauthorized') ? 401 : 403
        return NextResponse.json({ error: authCheck.error ?? 'Forbidden' }, { status })
      }
    }

    let body: { type?: GenerateType } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const type = body.type ?? 'all'
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await ServerNotificationService.generateAndDeliverNotifications(type)

    return NextResponse.json({
      success: true,
      message: `Notifications generated and delivery attempted for type: ${type}`,
      ...result,
    })
  } catch (error) {
    console.error('Error in POST /api/notifications/send:', error)
    return NextResponse.json(
      {
        error: 'Failed to send notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
