import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { safeSelect, safeInsert, safeRpc } from '@/lib/supabase-helpers'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

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
    const { data: userAccess, error: accessError } = await safeSelect(supabase, 'user_church_roles', {
      columns: 'id',
      filter: { column: 'user_id', value: user.id }
    })

    if (accessError) {
      console.error('Error checking user access:', accessError)
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
    }

    const hasAccess = userAccess?.find(role =>
      (role as any).church_id === churchId && (role as any).is_active === true
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get funds for this church
    const { data: funds, error } = await safeSelect(supabase, 'funds', {
      filter: { column: 'church_id', value: churchId },
      order: { column: 'name', ascending: true }
    })

    const activeFunds = funds?.filter(fund => fund.is_active) || []

    if (error) {
      console.error('Error fetching church funds:', error)
      return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
    }

    return NextResponse.json({ funds: activeFunds })
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
    const { data: hasPermission, error: permissionError } = await safeRpc(supabase, 'check_user_permission', {
      p_user_id: user.id,
      p_church_id: churchId,
      p_resource: 'funds',
      p_action: 'create'
    })

    if (permissionError) {
      console.error('Error checking permissions:', permissionError)
      return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to create funds' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, fund_type, current_balance } = body

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
    }

    // Create the fund
    const { data: funds, error } = await safeInsert(supabase, 'funds', {
      name,
      description,
      fund_type: fund_type || 'general',
      current_balance: current_balance || 0,
      church_id: churchId
    })

    const fund = funds?.[0]

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