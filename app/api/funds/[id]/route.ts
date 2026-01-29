import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type FundUpdate = Database['public']['Tables']['funds']['Update']

// PUT /api/funds/[id] - Update a specific fund
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Update fund using standard client (RPF policies allow update for authorized users)
    const updateData = {
      name: updates.name || (existingFund as any).name,
      description: updates.description !== undefined ? updates.description : (existingFund as any).description,
      target_amount: updates.target_amount !== undefined ? updates.target_amount : (existingFund as any).target_amount,
      fund_type: updates.fund_type !== undefined ? updates.fund_type : (existingFund as any).fund_type,
      current_balance: updates.current_balance !== undefined ? updates.current_balance : (existingFund as any).current_balance
    };

    const { data: fund, error: updateError } = await supabase
      .from('funds')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update fund' },
        { status: 500 }
      )
    }

    return NextResponse.json({ fund })
  } catch (error) {
    console.error('PUT error:', error)
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

    // Check if fund exists
    const { data: fund, error: fundError } = await supabase
      .from('funds')
      .select('id')
      .eq('id', id)
      .single()

    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Check for existing transactions using generic RPC (SECURITY DEFINER bypasses RLS safely)
    // This avoids needing the potentially broken service role key
    const { data: hasTransactions, error: rpcError } = await supabase
      .rpc('check_fund_has_transactions', { p_fund_id: id })

    if (rpcError) {
      console.error('Error checking transactions (RPC):', rpcError)
      return NextResponse.json(
        {
          error: 'Failed to verify fund dependencies',
          details: rpcError.message,
          code: rpcError.code
        },
        { status: 500 }
      )
    }

    if (hasTransactions) {
      return NextResponse.json(
        { error: 'Cannot delete fund with existing transactions' },
        { status: 400 }
      )
    }

    // Delete fund using authenticated client (RLS policy allows deletion for authorized users)
    const { error: deleteError } = await supabase
      .from('funds')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete fund' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Fund deleted successfully' })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}