import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type FundInsert = Database['public']['Tables']['funds']['Insert']

// GET /api/funds - Get all funds
export async function GET() {
  try {
    const supabase = await createServerClient()
    
    const { data: funds, error } = await supabase
      .from('funds')
      .select('*')
      .order('name')
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch funds' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ funds })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/funds - Create a new fund
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
    
    const { name, current_balance = 0 }: FundInsert = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await adminSupabase
      .from('funds')
      .insert({
        name,
        current_balance,
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create fund' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ fund: data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH method removed - using direct Supabase approach in frontend