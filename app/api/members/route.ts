import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type MemberInsert = Database['public']['Tables']['members']['Insert']
type MemberUpdate = Database['public']['Tables']['members']['Update']

// GET /api/members - Get all members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get church_id from query parameters
    const { searchParams } = new URL(request.url)
    const church_id = searchParams.get('church_id')

    let query = supabase
      .from('members')
      .select('*')
      .order('name')

    // Filter by church if provided
    if (church_id) {
      query = query.eq('church_id', church_id)
    }

    const { data: members, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    return NextResponse.json({ members })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { getUserPermissions } = await import('@/lib/permission-helpers')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('[Members API] Creating member:', body)

    const { name, phone, fellowship_name, job, location, church_id } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Member name is required' },
        { status: 400 }
      )
    }

    // Validate church_id is provided
    if (!church_id) {
      return NextResponse.json(
        { error: 'Church context is required. Please select a church.' },
        { status: 400 }
      )
    }

    // Check if user has access to create members in this church
    const permissions = await getUserPermissions(supabase as any, user.id)
    if (!permissions.hasPermission('admin.churches.update', church_id) &&
      !permissions.hasPermission('offerings.create', church_id) &&
      !permissions.isSuperAdmin) {
      console.warn(`[Members API] User ${user.id} denied access to create member in church ${church_id}`)
      return NextResponse.json(
        { error: 'You do not have permission to create members in this church' },
        { status: 403 }
      )
    }

    // Use standard authenticated client - RLS policies handle permissions (including super_admin)
    // This avoids issues where admin client might be misconfigured or fail RLS checks unexpectedly
    const { data: member, error } = await (supabase
      .from('members') as any)
      .insert({
        name: name.trim(),
        phone: phone?.trim() || null,
        fellowship_name: fellowship_name?.trim() || null,
        job: job?.trim() || null,
        location: location?.trim() || null,
        church_id: church_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Members API] Member creation error:', error)
      // Check for specific database constraint errors
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid church selection. Please select a valid church.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create member', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('[Members API] Internal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/members - Update a member
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { id, ...updates }: MemberUpdate & { id: string } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Get current member
    const { data: currentMember, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Update member
    const { data: member, error: updateError } = await (supabase
      .from('members') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Member update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ member })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/members - Delete a member
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if member exists
    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Delete member
    const { error: deleteError } = await (supabase
      .from('members') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Member deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete member', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Member deleted successfully' })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}