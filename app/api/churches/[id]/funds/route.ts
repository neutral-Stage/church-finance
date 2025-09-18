import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const churchId = params.id

    // Check user has access to this church
    const { data: hasAccess } = await supabase
      .from('user_church_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('church_id', churchId)
      .eq('is_active', true)
      .single()

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get funds for this church
    const { data: funds, error } = await supabase
      .from('funds')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching church funds:', error)
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
    }

    return NextResponse.json({ funds })
  } catch (error) {
    console.error('Unexpected error in church funds API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const churchId = params.id

    // Check user permissions to create funds
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: user.id,
        p_church_id: churchId,
        p_resource: 'funds',
        p_action: 'create'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to create funds' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, fund_type, current_balance } = body

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
    }

    // Create the fund
    const { data: fund, error } = await supabase
      .from('funds')
      .insert({
        name,
        description,
        fund_type: fund_type || 'general',
        current_balance: current_balance || 0,
        church_id: churchId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating fund:', error)
      return NextResponse.json({ error: 'Failed to create fund' }, { status: 500 })
    }

    return NextResponse.json({ fund }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating fund:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}