import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type MemberInsert = Database['public']['Tables']['members']['Insert']
type MemberUpdate = Database['public']['Tables']['members']['Update']

// GET /api/members - Get all members
export async function GET() {
  try {
    const supabase = await createServerClient()
    
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('name')
    
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
    
    const { name, phone, fellowship_name, job, location }: MemberInsert = body
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Member name is required' },
        { status: 400 }
      )
    }
    
    const { data: member, error } = await adminSupabase
      .from('members')
      .insert({
        name: name.trim(),
        phone: phone?.trim() || null,
        fellowship_name: fellowship_name?.trim() || null,
        job: job?.trim() || null,
        location: location?.trim() || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create member' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ member }, { status: 201 })
  } catch {
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
    const { data: member, error: updateError } = await adminSupabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update member' },
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
    const { error: deleteError } = await adminSupabase
      .from('members')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete member' },
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