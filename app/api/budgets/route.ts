import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/budgets?church_id=&year=
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id')
    const year = searchParams.get('year')

    if (!churchId) {
      return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
    }

    let query = supabase.from('budgets').select('*').eq('church_id', churchId).order('category', { ascending: true })

    if (year) {
      query = query.eq('year', parseInt(year, 10))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    return NextResponse.json({ budgets: data || [], success: true })
  } catch (error) {
    console.error('Budgets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/budgets
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { church_id, fund_id, category, year, month, amount } = body

    if (!church_id || !category || !year || amount === undefined) {
      return NextResponse.json(
        { error: 'church_id, category, year, and amount are required' },
        { status: 400 }
      )
    }

    const { data, error } = await adminSupabase
      .from('budgets')
      .insert({
        church_id,
        fund_id: fund_id || null,
        category,
        year: parseInt(String(year), 10),
        month: month != null ? parseInt(String(month), 10) : null,
        amount: parseFloat(String(amount)),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
    }

    return NextResponse.json({ budget: data, success: true }, { status: 201 })
  } catch (error) {
    console.error('Budgets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/budgets
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, fund_id, category, year, month, amount } = body

    if (!id) {
      return NextResponse.json({ error: 'Budget id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (fund_id !== undefined) updateData.fund_id = fund_id
    if (category !== undefined) updateData.category = category
    if (year !== undefined) updateData.year = parseInt(String(year), 10)
    if (month !== undefined) updateData.month = month != null ? parseInt(String(month), 10) : null
    if (amount !== undefined) updateData.amount = parseFloat(String(amount))

    const { data, error } = await adminSupabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
    }

    return NextResponse.json({ budget: data, success: true })
  } catch (error) {
    console.error('Budgets PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/budgets?id=
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Budget id is required' }, { status: 400 })
    }

    const { error } = await adminSupabase.from('budgets').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Budgets DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
