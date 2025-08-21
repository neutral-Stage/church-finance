import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase'
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

// PATCH /api/funds - Update fund balance (for transfers)
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()
    
    // Check authentication
    const { data: { user: patchUser }, error: patchAuthError } = await supabase.auth.getUser()
    if (patchAuthError || !patchUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    const { fromFundId, toFundId, amount, description } = body
    
    if (!fromFundId || !toFundId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid transfer parameters' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Start a transaction by getting current balances and fund names
    const { data: fromFund, error: fromError } = await supabase
      .from('funds')
      .select('current_balance, name')
      .eq('id', fromFundId)
      .single()
    
    if (fromError || !fromFund) {
      return NextResponse.json(
        { error: 'Source fund not found' },
        { status: 404 }
      )
    }
    
    const { data: toFund, error: toError } = await supabase
      .from('funds')
      .select('current_balance, name')
      .eq('id', toFundId)
      .single()
    
    if (toError || !toFund) {
      return NextResponse.json(
        { error: 'Destination fund not found' },
        { status: 404 }
      )
    }
    
    // Check if source fund has sufficient balance
    if (fromFund.current_balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      )
    }
    
    // Update source fund (subtract amount)
    const { error: updateFromError } = await adminSupabase
      .from('funds')
      .update({ current_balance: fromFund.current_balance - amount })
      .eq('id', fromFundId)
    
    if (updateFromError) {
      return NextResponse.json(
        { error: 'Failed to update source fund' },
        { status: 500 }
      )
    }
    
    // Update destination fund (add amount)
    const { error: updateToError } = await adminSupabase
      .from('funds')
      .update({ current_balance: toFund.current_balance + amount })
      .eq('id', toFundId)
    
    if (updateToError) {
      // Rollback source fund update
      await adminSupabase
        .from('funds')
        .update({ current_balance: fromFund.current_balance })
        .eq('id', fromFundId)
      
      return NextResponse.json(
        { error: 'Failed to update destination fund' },
        { status: 500 }
      )
    }
    
    // Create expense transaction for source fund
    const expenseDescription = description 
      ? `Transfer to ${toFund.name}: ${description}` 
      : `Transfer to ${toFund.name}`
    
    const { error: expenseError } = await adminSupabase
      .from('transactions')
      .insert({
        type: 'expense',
        amount: amount,
        description: expenseDescription,
        category: 'Fund Transfer',
        payment_method: 'bank',
        transaction_date: new Date().toISOString().split('T')[0],
        fund_id: fromFundId,
        reference_id: toFundId.toString(),
        created_by: patchUser.id
      })
    
    if (expenseError) {
      // Rollback fund updates if transaction creation fails
      await adminSupabase
        .from('funds')
        .update({ current_balance: fromFund.current_balance })
        .eq('id', fromFundId)
      await adminSupabase
        .from('funds')
        .update({ current_balance: toFund.current_balance })
        .eq('id', toFundId)
      
      return NextResponse.json(
        { error: 'Failed to create expense transaction record' },
        { status: 500 }
      )
    }
    
    // Create income transaction for destination fund
    const incomeDescription = description 
      ? `Transfer from ${fromFund.name}: ${description}` 
      : `Transfer from ${fromFund.name}`
    
    const { error: incomeError } = await adminSupabase
      .from('transactions')
      .insert({
        type: 'income',
        amount: amount,
        description: incomeDescription,
        category: 'Fund Transfer',
        payment_method: 'bank',
        transaction_date: new Date().toISOString().split('T')[0],
        fund_id: toFundId,
        reference_id: fromFundId.toString(),
        created_by: patchUser.id
      })
    
    if (incomeError) {
      // Rollback fund updates if transaction creation fails
      await adminSupabase
        .from('funds')
        .update({ current_balance: fromFund.current_balance })
        .eq('id', fromFundId)
      await adminSupabase
        .from('funds')
        .update({ current_balance: toFund.current_balance })
        .eq('id', toFundId)
      
      return NextResponse.json(
        { error: 'Failed to create income transaction record' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Transfer completed successfully',
      fromFundBalance: fromFund.current_balance - amount,
      toFundBalance: toFund.current_balance + amount
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}