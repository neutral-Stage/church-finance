import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type FundUpdate = Database['public']['Tables']['funds']['Update']

// PUT /api/funds/[id] - Update a specific fund
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    
    const { id } = params
    const body = await request.json()
    
    const updates: FundUpdate & { description?: string; target_amount?: number; fund_type?: string } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Fund ID is required' },
        { status: 400 }
      )
    }
    
    // Check if fund exists
    const { data: existingFund, error: fetchError } = await supabase
      .from('funds')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !existingFund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }
    
    // Update fund
    const { data: fund, error: updateError } = await adminSupabase
      .from('funds')
      .update({
        name: updates.name || existingFund.name,
        description: updates.description !== undefined ? updates.description : existingFund.description,
        target_amount: updates.target_amount !== undefined ? updates.target_amount : (existingFund as Database['public']['Tables']['funds']['Row'] & { target_amount?: number }).target_amount,
        fund_type: updates.fund_type !== undefined ? updates.fund_type : (existingFund as Database['public']['Tables']['funds']['Row'] & { fund_type?: string }).fund_type,
        current_balance: updates.current_balance !== undefined ? updates.current_balance : existingFund.current_balance
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update fund' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ fund })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/funds/[id] - Delete a specific fund
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Fund ID is required' },
        { status: 400 }
      )
    }
    
    // Check if fund exists and has no transactions
    const [fundResult, transactionResult] = await Promise.all([
      supabase.from('funds').select('*').eq('id', id).single(),
      supabase.from('transactions').select('id').eq('fund_id', id).limit(1)
    ])
    
    if (fundResult.error || !fundResult.data) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }
    
    if (transactionResult.data && transactionResult.data.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fund with existing transactions' },
        { status: 400 }
      )
    }
    
    // Delete fund
    const { error: deleteError } = await adminSupabase
      .from('funds')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete fund' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ message: 'Fund deleted successfully' })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}