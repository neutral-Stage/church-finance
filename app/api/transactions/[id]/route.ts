import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminClient()
    
    // Check authentication using custom cookie system
    const authCookie = request.cookies.get('church-auth-minimal')
    if (!authCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const authData = JSON.parse(authCookie.value)
      if (!authData.user_id || authData.expires_at <= Math.floor(Date.now() / 1000)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    const { id } = params
    const body = await request.json()
    
    const transactionData: TransactionUpdate = {
      type: body.type,
      amount: body.amount,
      description: body.description,
      fund_id: body.fund_id,
      category: body.category,
      payment_method: body.payment_method,
      transaction_date: body.transaction_date,
      receipt_number: body.receipt_number || null
    }
    
    // Get current transaction for balance adjustment
    const { data: currentTransaction, error: fetchError } = await adminSupabase
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
      .update(transactionData)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Transaction update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update transaction', details: updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminClient()
    
    // Check authentication using custom cookie system
    const authCookie = request.cookies.get('church-auth-minimal')
    if (!authCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const authData = JSON.parse(authCookie.value)
      if (!authData.user_id || authData.expires_at <= Math.floor(Date.now() / 1000)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    const { id } = params
    
    // Get transaction details before deletion for balance adjustment
    const { data: transaction, error: fetchError } = await adminSupabase
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
      console.error('Transaction delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete transaction', details: deleteError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}