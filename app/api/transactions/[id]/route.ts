import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// PUT /api/transactions/[id] - Update a specific transaction
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
    
    const updates: TransactionUpdate = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }
    
    // Get current transaction
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !currentTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }
    
    // Update transaction
    const { data: transaction, error: updateError } = await adminSupabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      )
    }
    
    // If amount or type changed, update fund balance
    if (updates.amount !== undefined || updates.type !== undefined) {
      const { data: fund, error: fundError } = await supabase
        .from('funds')
        .select('current_balance')
        .eq('id', currentTransaction.fund_id)
        .single()
      
      if (fundError || !fund) {
        return NextResponse.json(
          { error: 'Fund not found' },
          { status: 404 }
        )
      }
      
      // Reverse old transaction effect
      const oldBalanceChange = currentTransaction.type === 'income' 
        ? -currentTransaction.amount 
        : currentTransaction.amount
      
      // Apply new transaction effect
      const newType = updates.type || currentTransaction.type
      const newAmount = updates.amount || currentTransaction.amount
      const newBalanceChange = newType === 'income' ? newAmount : -newAmount
      
      const finalBalance = fund.current_balance + oldBalanceChange + newBalanceChange

      const { error: balanceUpdateError } = await adminSupabase
        .from('funds')
        .update({ current_balance: finalBalance })
        .eq('id', currentTransaction.fund_id)
      
      if (balanceUpdateError) {
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json({ transaction })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a specific transaction
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
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }
    
    // Get transaction details before deletion
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }
    
    // Delete transaction
    const { error: deleteError } = await adminSupabase
      .from('transactions')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete transaction' },
        { status: 500 }
      )
    }
    
    // Reverse the transaction's effect on fund balance
    const { data: fund, error: fundError } = await supabase
      .from('funds')
      .select('current_balance')
      .eq('id', transaction.fund_id)
      .single()
    
    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Failed to update fund balance' },
        { status: 500 }
      )
    }
    
    const balanceChange = transaction.type === 'income' 
      ? -transaction.amount 
      : transaction.amount
    
    const { error: balanceUpdateError } = await adminSupabase
      .from('funds')
      .update({ current_balance: fund.current_balance + balanceChange })
      .eq('id', transaction.fund_id)
    
    if (balanceUpdateError) {
      return NextResponse.json(
        { error: 'Failed to update fund balance' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}