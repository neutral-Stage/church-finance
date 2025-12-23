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
      const { data: userChurchRole, error: roleError } = await supabase
        .from('user_church_roles')
        .select(`
          id,
          church_id,
          role_id,
          is_active,
          churches!inner(
            id,
            name,
            type,
            is_active
          ),
          roles!inner(
            id,
            name,
            display_name
          )
        `)
        .eq('user_id', user.id)
        .eq('church_id', church.id)
        .eq('is_active', true)
        .single()

      if (roleError || !userChurchRole) {
        console.error('[ChurchSelection API] POST - Access denied:', roleError)
        return NextResponse.json({ error: 'Access denied to selected church' }, { status: 403 })
      }

      const cookieValue = JSON.stringify(church)
      console.log('[ChurchSelection API] POST - Setting cookie:', {
        churchId: church.id,
        cookieLength: cookieValue.length,
        cookiePreview: cookieValue.substring(0, 100)
      })

      // Set the selected church cookie
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

      // Return response with cache headers to prevent caching
      return NextResponse.json({
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
    } else {
      console.log('[ChurchSelection API] POST - Clearing church cookie')
      // Clear the selected church cookie
      cookieStore.delete('selectedChurch')

      // Revalidate all dashboard pages to clear cached data
      revalidatePath('/(dashboard)', 'layout')

      return NextResponse.json({
        success: true,
        message: 'Church selection cleared'
      })
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

        // Validate that this church is still accessible to the user
        const { data: userChurchRole, error: roleError } = await supabase
          .from('user_church_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('church_id', churchData.id)
          .eq('is_active', true)
          .single()

        if (roleError || !userChurchRole) {
          // Church is no longer accessible, clear the cookie
          console.log('[ChurchSelection API] GET - Church no longer accessible, clearing cookie')
          cookieStore.delete('selectedChurch')
          return NextResponse.json({ church: null }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
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
        return NextResponse.json({ church: null }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
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