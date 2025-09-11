import { NextRequest, NextResponse } from 'next/server'
import { ServerNotificationService } from '@/lib/notifications/server'
import { NotificationApiResponse } from '@/types/notifications'

export async function POST(request: NextRequest): Promise<NextResponse<NotificationApiResponse>> {
  try {
    // Optional: Add authentication/authorization here for additional security
    // This endpoint could be protected with API keys for cron jobs or admin operations
    // const authorization = request.headers.get('authorization')
    // if (!authorization || !isValidApiKey(authorization)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const { type } = body

    // Validate type parameter if provided
    const validTypes = ['all', 'bills', 'transactions', 'offerings', 'advances', 'cleanup']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { 
          error: 'Invalid type', 
          details: `Type must be one of: ${validTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Generate notifications based on type
    switch (type) {
      case 'bills':
        await ServerNotificationService.generateBillNotifications()
        break
      case 'transactions':
        await ServerNotificationService.generateTransactionNotifications()
        break
      case 'offerings':
        await ServerNotificationService.generateOfferingNotifications()
        break
      case 'advances':
        await ServerNotificationService.generateAdvanceNotifications()
        break
      case 'cleanup':
        await ServerNotificationService.cleanupOldNotifications()
        break
      case 'all':
      default:
        // Generate all types by default
        await ServerNotificationService.generateAllNotifications()
        break
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notifications generated successfully for type: ${type || 'all'}` 
    })
  } catch (error) {
    console.error('Error in POST /api/notifications/generate:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}