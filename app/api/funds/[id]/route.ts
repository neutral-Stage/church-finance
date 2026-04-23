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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const updates: FundUpdate & { description?: string; target_amount?: number; fund_type?: string } = body

    // Fetch through user client — RLS ensures access to own-church fund only.
    const { data: existingFund, error: fetchError } = await supabase
      .from('funds').select('*').eq('id', id).single()
    if (fetchError || !existingFund) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    const updateData = {
      name: updates.name || (existingFund as any).name,
      description: updates.description !== undefined ? updates.description : (existingFund as any).description,
      target_amount: updates.target_amount !== undefined ? updates.target_amount : (existingFund as any).target_amount,
      fund_type: updates.fund_type !== undefined ? updates.fund_type : (existingFund as any).fund_type,
      current_balance: updates.current_balance !== undefined ? updates.current_balance : (existingFund as any).current_balance,
    }

    const { data: fund, error: updateError } = await (supabase.from('funds') as any)
      .update(updateData)
      .eq('id', id)
      .eq('church_id', (existingFund as any).church_id)
      .select().single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update fund' }, { status: 500 })
    }
    return NextResponse.json({ fund })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/funds/[id] - Delete a specific fund
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const [fundResult, transactionResult] = await Promise.all([
      supabase.from('funds').select('id, church_id').eq('id', id).single(),
      supabase.from('transactions').select('id').eq('fund_id', id).limit(1),
    ])

    if (fundResult.error || !fundResult.data) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    if (transactionResult.data && transactionResult.data.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fund with existing transactions' },
        { status: 400 },
      )
    }

    const { error: deleteError } = await (supabase.from('funds') as any)
      .delete()
      .eq('id', id)
      .eq('church_id', (fundResult.data as any).church_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete fund' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Fund deleted successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}