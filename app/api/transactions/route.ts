import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { createServices } from '@/lib/type-safe-api'
import { getUserPermissions } from '@/lib/permission-helpers'
import type { Database } from '@/types/database'

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// GET /api/transactions - Get all transactions with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const services = createServices(supabase as any)
    const { searchParams } = new URL(request.url)

    // Get church_id from query params (automatically added by church-aware API client)
    const churchId = searchParams.get('church_id')
    if (!churchId) {
      return NextResponse.json(
        { error: 'Church context is required. Please select a church.' },
        { status: 400 }
      )
    }

    // Validate user has access to this church
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has access to the specified church using helper (handles super_admin)
    const permissions = await getUserPermissions(supabase as any, user.id)
    if (!permissions.hasChurchAccess(churchId)) {
      return NextResponse.json(
        { error: 'You do not have access to this church' },
        { status: 403 }
      )
    }

    const options = {
      fundId: searchParams.get('fund_id') || undefined,
      churchId: churchId,
      type: searchParams.get('type') || undefined,
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    const result = await services.transactions.getTransactions(options)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactions: result.data,
      success: true
    })
  } catch (error) {
    console.error('Transactions API error:', error)
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
    const services = createServices(supabase as any)

    const body = await request.json()

    // Get church_id from body (automatically added by church-aware API client)
    const churchId = body.church_id
    if (!churchId) {
      return NextResponse.json(
        { error: 'Church context is required. Please select a church.' },
        { status: 400 }
      )
    }

    // Validate user has access to this church
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has access to the specified church using helper (handles super_admin)
    const permissions = await getUserPermissions(supabase as any, user.id)
    if (!permissions.hasChurchAccess(churchId)) {
      return NextResponse.json(
        { error: 'You do not have access to this church' },
        { status: 403 }
      )
    }

    const transactionData = {
      type: body.type,
      amount: body.amount,
      description: body.description,
      fund_id: body.fund_id,
      category: body.category,
      payment_method: body.payment_method,
      transaction_date: body.transaction_date,
      receipt_number: body.receipt_number || null,
      church_id: churchId
    }

    const result = await services.transactions.createTransaction(transactionData)

    if (!result.success) {
      const status = result.error?.includes('Unauthorized') ? 401 :
        result.error?.includes('Insufficient') ? 400 :
          result.error?.includes('not found') ? 404 : 500
      return NextResponse.json(
        { error: result.error },
        { status }
      )
    }

    return NextResponse.json({
      transaction: result.data,
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Transaction creation error:', error)
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
    const { data: transaction, error: updateError } = await (adminSupabase
      .from('transactions') as any)
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
        .eq('id', (currentTransaction as any).fund_id)
        .single()

      if (fundError || !fund) {
        return NextResponse.json(
          { error: 'Fund not found' },
          { status: 404 }
        )
      }

      // Reverse old transaction effect
      const oldBalanceChange = (currentTransaction as any).type === 'income'
        ? -(currentTransaction as any).amount
        : (currentTransaction as any).amount

      // Apply new transaction effect
      const newType = updates.type || (currentTransaction as any).type
      const newAmount = updates.amount || (currentTransaction as any).amount
      const newBalanceChange = newType === 'income' ? newAmount : -newAmount

      const finalBalance = (fund as any).current_balance + oldBalanceChange + newBalanceChange

      const { error: balanceUpdateError } = await (adminSupabase
        .from('funds') as any)
        .update({ current_balance: finalBalance })
        .eq('id', (currentTransaction as any).fund_id)

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
      .eq('id', (transaction as any).fund_id)
      .single()

    if (fundError || !fund) {
      return NextResponse.json(
        { error: 'Failed to update fund balance' },
        { status: 500 }
      )
    }

    const balanceChange = (transaction as any).type === 'income'
      ? -(transaction as any).amount
      : (transaction as any).amount

    const { error: balanceUpdateError } = await (adminSupabase
      .from('funds') as any)
      .update({ current_balance: (fund as any).current_balance + balanceChange })
      .eq('id', (transaction as any).fund_id)

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