import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ChurchWithRole } from '@/types/database'

// Force dynamic rendering since this route uses cookies
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[ChurchSelection API] POST - Unauthorized:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { church } = body

    console.log('[ChurchSelection API] POST - Request:', {
      userId: user.id,
      churchId: church?.id,
      churchName: church?.name
    })

    const cookieStore = await cookies()

    if (church) {
      // Validate that the user has access to this church
      let hasAccess = false;
      
      // 1. First check if user is a super admin
      const { data: userChurchRoles } = await supabase
        .from('user_church_roles')
        .select('role_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (userChurchRoles && userChurchRoles.length > 0) {
        const { data: roles } = await supabase.from('roles').select('id, name')
        const rolesMap = new Map((roles || []).map((r: any) => [r.id, r.name]))
        
        hasAccess = userChurchRoles.some((role: any) => {
          return role.role_id && rolesMap.get(role.role_id) === 'super_admin'
        })
      }

      // 2. If not super admin, rely on RLS on churches directly
      if (!hasAccess) {
        const { data: accessibleChurch } = await supabase
          .from('churches')
          .select('id')
          .eq('id', church.id)
          .eq('is_active', true)
          .maybeSingle()
          
        hasAccess = !!accessibleChurch;
      }

      if (!hasAccess) {
        console.error('[ChurchSelection API] POST - Access denied for church:', church.id)
        return NextResponse.json({ error: 'Access denied to selected church' }, { status: 403 })
      }

      // To strictly guarantee we don't hit the 4096 byte cookie limit,
      // extract only the essential properties needed by the UI and API.
      const minimalChurch = {
        id: church.id,
        name: church.name,
        type: church.type,
        role_name: church.role_name || church.role?.name,
        role_display_name: church.role_display_name || church.role?.display_name,
        role: church.role ? {
          name: church.role.name,
          display_name: church.role.display_name
        } : undefined
      };
      
      const cookieValue = JSON.stringify(minimalChurch)
      console.log('[ChurchSelection API] POST - Setting cookie:', {
        churchId: church.id,
        cookieLength: cookieValue.length,
        cookiePreview: cookieValue.substring(0, 100)
      })

      // We set via both cookieStore and NextResponse to ensure compatibility with all Next.js 14+ versions
      cookieStore.set('selectedChurch', cookieValue, {
        httpOnly: false, // Allow client-side access for consistency
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })

      // Verify the cookie was set
      const verifyChurchCookie = cookieStore.get('selectedChurch')
      console.log('[ChurchSelection API] POST - Cookie verification:', {
        cookieSet: !!verifyChurchCookie,
        cookieValueMatches: verifyChurchCookie?.value === cookieValue
      })

      // Revalidate all dashboard pages to refetch data with new church context
      revalidatePath('/(dashboard)', 'layout')

      console.log('[ChurchSelection API] POST - ✓ Cookie set successfully for church:', church.id)

      // Return response with explicit cookie headers to prevent Next.js Route Handler dropping them
      const response = NextResponse.json({
        success: true,
        message: 'Church selection synchronized',
        church
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      response.cookies.set('selectedChurch', cookieValue, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
      
      return response
    } else {
      console.log('[ChurchSelection API] POST - Clearing church cookie')
      // Clear the selected church cookie
      cookieStore.delete('selectedChurch')

      // Revalidate all dashboard pages to clear cached data
      revalidatePath('/(dashboard)', 'layout')

      const response = NextResponse.json({
        success: true,
        message: 'Church selection cleared'
      })
      response.cookies.delete('selectedChurch')
      return response
    }
  } catch (error) {
    console.error('[ChurchSelection API] POST - Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const selectedChurchCookie = cookieStore.get('selectedChurch')

    console.log('[ChurchSelection API] GET - Cookie exists:', !!selectedChurchCookie, selectedChurchCookie?.value?.substring(0, 50))

    if (selectedChurchCookie) {
      try {
        const churchData = JSON.parse(selectedChurchCookie.value)

        // Validate access via a single RLS-enforced query (RLS handles permissions at DB level)
        const { data: accessibleChurch } = await supabase
          .from('churches')
          .select('id')
          .eq('id', churchData.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!accessibleChurch) {
          // Church is no longer accessible, clear the cookie
          console.log('[ChurchSelection API] GET - Church no longer accessible, clearing cookie')
          cookieStore.delete('selectedChurch')
          const response = NextResponse.json({ church: null }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
          response.cookies.delete('selectedChurch')
          return response
        }

        console.log('[ChurchSelection API] GET - Returning church:', churchData.id)
        return NextResponse.json({ church: churchData }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      } catch (error) {
        // Invalid cookie data, clear it
        console.log('[ChurchSelection API] GET - Invalid cookie data, clearing')
        cookieStore.delete('selectedChurch')
        const response = NextResponse.json({ church: null }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        response.cookies.delete('selectedChurch')
        return response
      }
    }

    console.log('[ChurchSelection API] GET - No cookie found')
    return NextResponse.json({ church: null }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error in church selection get:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}