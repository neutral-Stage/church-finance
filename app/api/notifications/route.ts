import { NextRequest, NextResponse } from 'next/server'
import { ServerNotificationService } from '@/lib/notifications/server'
import { createApiRouteClient } from '@/lib/supabase-server'
import { NotificationApiResponse } from '@/types/notifications'

export async function GET(request: NextRequest): Promise<NextResponse<NotificationApiResponse>> {
  try {
    // Get authenticated user - first try Supabase auth, then minimal auth cookie
    const supabase = await createApiRouteClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let userId: string | null = null
    
    // If Supabase auth fails, check minimal auth cookie
    if (authError || !user) {
      const authCookie = request.cookies.get('church-auth-minimal')
      if (authCookie?.value) {
        try {
          const authData = JSON.parse(authCookie.value)
          if (authData.expires_at && authData.expires_at > Math.floor(Date.now() / 1000)) {
            userId = authData.user_id
          }
        } catch (parseError) {
          console.error('Error parsing minimal auth cookie:', parseError)
        }
      }
    } else {
      userId = user.id
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No authenticated user' }, 
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 100) : 20 // Clamp between 1-100

    if (limitParam && isNaN(parseInt(limitParam))) {
      return NextResponse.json(
        { error: 'Invalid limit parameter', details: 'Limit must be a number' },
        { status: 400 }
      )
    }

    // Fetch notifications
    const notifications = await ServerNotificationService.getUserNotifications(userId, limit)
    
    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch notifications', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<NotificationApiResponse>> {
  try {
    // Get authenticated user - first try Supabase auth, then minimal auth cookie
    const supabase = await createApiRouteClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let userId: string | null = null
    
    // If Supabase auth fails, check minimal auth cookie
    if (authError || !user) {
      const authCookie = request.cookies.get('church-auth-minimal')
      if (authCookie?.value) {
        try {
          const authData = JSON.parse(authCookie.value)
          if (authData.expires_at && authData.expires_at > Math.floor(Date.now() / 1000)) {
            userId = authData.user_id
          }
        } catch (error) {
          console.error('Error parsing minimal auth cookie:', error)
        }
      }
    } else {
      userId = user.id
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No authenticated user' },
        { status: 401 }
      )
    }

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

    const { action, notificationId, notificationData } = body

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Invalid action', details: 'Action field is required and must be a string' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'markAsRead':
        if (!notificationId || typeof notificationId !== 'string') {
          return NextResponse.json(
            { error: 'Invalid notification ID', details: 'Notification ID is required and must be a string' }, 
            { status: 400 }
          )
        }
        await ServerNotificationService.markAsRead(notificationId)
        return NextResponse.json({ success: true, message: 'Notification marked as read' })

      case 'markAllAsRead':
        await ServerNotificationService.markAllAsRead(userId)
        return NextResponse.json({ success: true, message: 'All notifications marked as read' })

      case 'delete':
        if (!notificationId || typeof notificationId !== 'string') {
          return NextResponse.json(
            { error: 'Invalid notification ID', details: 'Notification ID is required and must be a string' }, 
            { status: 400 }
          )
        }
        await ServerNotificationService.deleteNotification(notificationId)
        return NextResponse.json({ success: true, message: 'Notification deleted' })

      case 'create':
        if (!notificationData || typeof notificationData !== 'object') {
          return NextResponse.json(
            { error: 'Invalid notification data', details: 'Notification data is required and must be an object' }, 
            { status: 400 }
          )
        }

        // Validate required fields
        if (!notificationData.title || typeof notificationData.title !== 'string') {
          return NextResponse.json(
            { error: 'Invalid title', details: 'Title is required and must be a string' }, 
            { status: 400 }
          )
        }

        if (!notificationData.message || typeof notificationData.message !== 'string') {
          return NextResponse.json(
            { error: 'Invalid message', details: 'Message is required and must be a string' }, 
            { status: 400 }
          )
        }

        // Validate optional fields
        if (notificationData.type && !['success', 'error', 'warning', 'info'].includes(notificationData.type)) {
          return NextResponse.json(
            { error: 'Invalid type', details: 'Type must be one of: success, error, warning, info' }, 
            { status: 400 }
          )
        }

        const notification = await ServerNotificationService.createNotification({
          userId: userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          category: notificationData.category || 'general',
          actionUrl: notificationData.actionUrl,
          metadata: notificationData.metadata
        })
        return NextResponse.json({ notification })

      case 'generateAll':
        await ServerNotificationService.generateAllNotifications()
        return NextResponse.json({ success: true, message: 'Notifications generated' })

      default:
        return NextResponse.json(
          { error: 'Invalid action', details: `Unknown action: ${action}. Valid actions are: markAsRead, markAllAsRead, delete, create, generateAll` }, 
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process notification request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}