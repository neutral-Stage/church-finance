import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// GET /api/transactions - Get all transactions with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    const fundId = searchParams.get('fund_id')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit')
    
    let query = supabase
      .from('transactions')
      .select(`
        *,
        funds(name)
      `)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (fundId) {
      query = query.eq('fund_id', fundId)
    }
    
    if (type) {
      query = query.eq('type', type)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    
    const { data: transactions, error } = await query
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ transactions })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create a new transaction
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
    
    const { 
      type, 
      amount, 
      description, 
      fund_id, 
      category 
    }: TransactionInsert = body
    
    if (!type || !amount || !fund_id) {
      return NextResponse.json(
        { error: 'Type, amount, and fund_id are required' },
        { status: 400 }
      )
    }
    
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }
    
    // Verify fund exists
    const { data: fund, error: fundError } = await supabase
      .from('funds')
      .select('id, current_balance')
      .eq('id', fund_id)
      .single()
    
    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }
    
    // For expense transactions, check if fund has sufficient balance
    if (type === 'expense' && fund.current_balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      )
    }
    
    // Create transaction
    const { data: transaction, error: transactionError } = await adminSupabase
      .from('transactions')
      .insert({
        type,
        amount,
        description,
        fund_id,
        category
      })
      .select()
      .single()
    
    if (transactionError) {
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }
    
    // Update fund balance
    const balanceChange = type === 'income' ? amount : -amount
    const newBalance = fund.current_balance + balanceChange

    const { error: updateError } = await adminSupabase
      .from('funds')
      .update({ current_balance: newBalance })
      .eq('id', fund_id)
    
    if (updateError) {
      // Rollback transaction creation
      await adminSupabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)
      
      return NextResponse.json(
        { error: 'Failed to update fund balance' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ transaction }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/transactions - Update a transaction
export async function PATCH(request: NextRequest) {
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
    
    const { id, ...updates }: TransactionUpdate & { id: string } = body
    
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

// DELETE /api/transactions - Delete a transaction
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