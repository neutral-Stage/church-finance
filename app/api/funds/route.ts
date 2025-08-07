import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type FundInsert = Database['public']['Tables']['funds']['Insert']

// GET /api/funds - Get all funds
export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data: funds, error } = await supabase
      .from('funds')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching funds:', error)
      return NextResponse.json(
        { error: 'Failed to fetch funds' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ funds })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/funds - Create a new fund
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    
    const { name, current_balance = 0 }: FundInsert = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Fund name is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('funds')
      .insert({
        name,
        current_balance
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating fund:', error)
      return NextResponse.json(
        { error: 'Failed to create fund' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ fund: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/funds - Update fund balance (for transfers)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    
    const { fromFundId, toFundId, amount, description } = body
    
    if (!fromFundId || !toFundId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid transfer parameters' },
        { status: 400 }
      )
    }
    
    // Start a transaction by getting current balances
    const { data: fromFund, error: fromError } = await supabase
      .from('funds')
      .select('current_balance')
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
      .select('current_balance')
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
    const { error: updateFromError } = await supabase
      .from('funds')
      .update({ current_balance: fromFund.current_balance - amount })
      .eq('id', fromFundId)
    
    if (updateFromError) {
      console.error('Error updating source fund:', updateFromError)
      return NextResponse.json(
        { error: 'Failed to update source fund' },
        { status: 500 }
      )
    }
    
    // Update destination fund (add amount)
    const { error: updateToError } = await supabase
      .from('funds')
      .update({ current_balance: toFund.current_balance + amount })
      .eq('id', toFundId)
    
    if (updateToError) {
      console.error('Error updating destination fund:', updateToError)
      // Rollback source fund update
      await supabase
        .from('funds')
        .update({ current_balance: fromFund.current_balance })
        .eq('id', fromFundId)
      
      return NextResponse.json(
        { error: 'Failed to update destination fund' },
        { status: 500 }
      )
    }
    
    // Create transaction record for the transfer
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        type: 'transfer',
        amount: amount,
        description: description || `Transfer from fund ${fromFundId} to fund ${toFundId}`,
        fund_id: toFundId,
        reference_id: fromFundId.toString()
      })
    
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError)
      // Note: We don't rollback the fund updates here as the transfer was successful
      // The transaction record is for audit purposes
    }
    
    return NextResponse.json({ 
      message: 'Transfer completed successfully',
      fromFundBalance: fromFund.current_balance - amount,
      toFundBalance: toFund.current_balance + amount
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}