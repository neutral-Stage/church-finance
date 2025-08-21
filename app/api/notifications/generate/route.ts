import { NextRequest, NextResponse } from 'next/server'
import NotificationService from '@/lib/notificationService'

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    // const authorization = request.headers.get('authorization')
    // if (!authorization || !isValidApiKey(authorization)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { type } = body

    // Generate notifications based on type
    switch (type) {
      case 'all':
        await NotificationService.generateAllNotifications()
        break
      case 'bills':
        await NotificationService.generateBillNotifications()
        break
      case 'transactions':
        await NotificationService.generateTransactionNotifications()
        break
      case 'offerings':
        await NotificationService.generateOfferingNotifications()
        break
      case 'advances':
        await NotificationService.generateAdvanceNotifications()
        break
      case 'cleanup':
        await NotificationService.cleanupOldNotifications()
        break
      default:
        // Generate all types by default
        await NotificationService.generateAllNotifications()
        break
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notifications generated successfully for type: ${type || 'all'}` 
    })
  } catch (error) {
    // Error handled silently
    return NextResponse.json(
      { 
        error: 'Failed to generate notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}