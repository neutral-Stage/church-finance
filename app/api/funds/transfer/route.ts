import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

// POST /api/funds/transfer - Transfer funds between funds
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
    const { from_fund_id, to_fund_id, amount, description, church_id } = body
    
    // Validate required fields
    if (!from_fund_id || !to_fund_id || !amount || !description) {
      return NextResponse.json(
        { error: 'All fields are required: from_fund_id, to_fund_id, amount, description' },
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
    
    if (from_fund_id === to_fund_id) {
      return NextResponse.json(
        { error: 'Cannot transfer to the same fund' },
        { status: 400 }
      )
    }
    
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Transfer amount must be greater than 0' },
        { status: 400 }
      )
    }
    
    // Start a transaction
    const { data: fromFund, error: fromFundError } = await adminSupabase
      .from('funds')
      .select('id, name, current_balance')
      .eq('id', from_fund_id)
      .single()
    
    if (fromFundError || !fromFund) {
      return NextResponse.json(
        { error: 'Source fund not found' },
        { status: 404 }
      )
    }
    
    const { data: toFund, error: toFundError } = await adminSupabase
      .from('funds')
      .select('id, name, current_balance')
      .eq('id', to_fund_id)
      .single()
    
    if (toFundError || !toFund) {
      return NextResponse.json(
        { error: 'Destination fund not found' },
        { status: 404 }
      )
    }
    
    // Check if source fund has sufficient balance
    if ((fromFund as any).current_balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance in source fund' },
        { status: 400 }
      )
    }
    
    // Update both funds
    const { error: updateFromFundError } = await (adminSupabase
      .from('funds') as any)
      .update({
        current_balance: (fromFund as any).current_balance - amount
      })
      .eq('id', from_fund_id)
    
    if (updateFromFundError) {
      return NextResponse.json(
        { error: 'Failed to update source fund' },
        { status: 500 }
      )
    }
    
    const { error: updateToFundError } = await (adminSupabase
      .from('funds') as any)
      .update({
        current_balance: (toFund as any).current_balance + amount
      })
      .eq('id', to_fund_id)
    
    if (updateToFundError) {
      // Rollback the first update
      await (adminSupabase
        .from('funds') as any)
        .update({
          current_balance: (fromFund as any).current_balance
        })
        .eq('id', from_fund_id)
      
      return NextResponse.json(
        { error: 'Failed to update destination fund' },
        { status: 500 }
      )
    }
    
    // Create transaction records for both funds
    const currentDate = new Date().toISOString()
    
    // Create expense transaction for source fund
    const { error: expenseTransactionError } = await (adminSupabase
      .from('transactions') as any)
      .insert({
        type: 'expense',
        amount: amount,
        description: `Transfer to ${(toFund as any).name}: ${description}`,
        category: 'Fund Transfer',
        payment_method: 'bank',
        fund_id: from_fund_id,
        transaction_date: currentDate,
        created_by: user.id,
        receipt_number: `TRANSFER-${Date.now()}-OUT`,
        church_id: church_id
      })
    
    if (expenseTransactionError) {
      console.error('Failed to create expense transaction:', expenseTransactionError)
    }
    
    // Create income transaction for destination fund
    const { error: incomeTransactionError } = await (adminSupabase
      .from('transactions') as any)
      .insert({
        type: 'income',
        amount: amount,
        description: `Transfer from ${(fromFund as any).name}: ${description}`,
        category: 'Fund Transfer',
        payment_method: 'bank',
        fund_id: to_fund_id,
        transaction_date: currentDate,
        created_by: user.id,
        receipt_number: `TRANSFER-${Date.now()}-IN`,
        church_id: church_id
      })
    
    if (incomeTransactionError) {
      console.error('Failed to create income transaction:', incomeTransactionError)
    }
    
    return NextResponse.json({
      message: 'Fund transfer completed successfully',
      transfer: {
        from_fund: (fromFund as any).name,
        to_fund: (toFund as any).name,
        amount,
        description
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Fund transfer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}