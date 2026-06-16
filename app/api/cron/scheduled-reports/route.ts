import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret =
    process.env.SCHEDULED_REPORTS_CRON_SECRET ?? process.env.NOTIFICATIONS_CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Stub cron endpoint for weekly treasurer digest emails.
 * Wire to Resend + report templates when scheduled reports are fully implemented.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resendConfigured = Boolean(process.env.RESEND_API_KEY)
    if (!resendConfigured) {
      return NextResponse.json({
        success: true,
        stub: true,
        message:
          'Scheduled report email stub executed. Set RESEND_API_KEY and implement digest delivery.',
        sent: 0,
      })
    }

    // Production path: query churches with scheduledReports feature + active schedules
    return NextResponse.json({
      success: true,
      stub: true,
      message: 'Scheduled report cron ready; digest delivery not yet wired to Resend.',
      sent: 0,
    })
  } catch (error) {
    console.error('Scheduled reports cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
