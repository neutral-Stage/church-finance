import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase';

// GET - Fetch ledger subgroups
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const ledger_entry_id = searchParams.get('ledger_entry_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const include_bills = searchParams.get('include_bills') === 'true';

    let query = supabase
      .from('ledger_subgroups')
      .select(`
        *,
        ledger_entries!inner(*),
        ${include_bills ? 'bills (*)' : ''}
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (ledger_entry_id) {
      query = query.eq('ledger_entry_id', ledger_entry_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: subgroups, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch ledger subgroups' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subgroups });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new ledger subgroup
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { 
      ledger_entry_id,
      title, 
      description, 
      purpose,
      status = 'active',
      default_due_date,
      default_fund_id,
      responsible_parties,
      allocation_percentage,
      priority = 'medium',
      sort_order = 0,
      notes,
      metadata = {}
    } = body;

    // Validate required fields
    if (!ledger_entry_id || !title) {
      return NextResponse.json(
        { error: 'Ledger entry ID and title are required' },
        { status: 400 }
      );
    }

    // Verify ledger entry exists
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('id', ledger_entry_id)
      .single();

    if (ledgerError || !ledgerEntry) {
      return NextResponse.json(
        { error: 'Ledger entry not found' },
        { status: 404 }
      );
    }

    // Create the ledger subgroup
    const { data: subgroup, error: subgroupError } = await adminSupabase
      .from('ledger_subgroups')
      .insert({
        ledger_entry_id,
        title,
        description: description || null,
        purpose: purpose || null,
        status,
        default_due_date: default_due_date || new Date().toISOString().split('T')[0],
        default_fund_id: default_fund_id || null,
        responsible_parties: responsible_parties || null,
        allocation_percentage: allocation_percentage || null,
        priority,
        sort_order,
        notes: notes || null,
        metadata,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (subgroupError) {
      return NextResponse.json(
        { error: 'Failed to create ledger subgroup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subgroup }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update ledger subgroup
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { 
      id, 
      title, 
      description, 
      purpose,
      status, 
      default_due_date,
      default_fund_id,
      responsible_parties,
      allocation_percentage,
      priority,
      sort_order,
      notes,
      metadata
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Subgroup ID is required' },
        { status: 400 }
      );
    }

    // Get the current subgroup
    const { data: currentSubgroup, error: fetchError } = await supabase
      .from('ledger_subgroups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentSubgroup) {
      return NextResponse.json(
        { error: 'Ledger subgroup not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      title: title || currentSubgroup.title,
      description: description !== undefined ? description : currentSubgroup.description,
      purpose: purpose !== undefined ? purpose : currentSubgroup.purpose,
      status: status || currentSubgroup.status,
      default_due_date: default_due_date || currentSubgroup.default_due_date,
      default_fund_id: default_fund_id !== undefined ? default_fund_id : currentSubgroup.default_fund_id,
      responsible_parties: responsible_parties !== undefined ? responsible_parties : currentSubgroup.responsible_parties,
      allocation_percentage: allocation_percentage !== undefined ? allocation_percentage : currentSubgroup.allocation_percentage,
      priority: priority || currentSubgroup.priority,
      sort_order: sort_order !== undefined ? sort_order : currentSubgroup.sort_order,
      notes: notes !== undefined ? notes : currentSubgroup.notes,
      metadata: metadata !== undefined ? metadata : currentSubgroup.metadata,
      updated_at: new Date().toISOString(),
    };

    const { data: subgroup, error: updateError } = await adminSupabase
      .from('ledger_subgroups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update ledger subgroup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subgroup });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete ledger subgroup
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Subgroup ID is required' },
        { status: 400 }
      );
    }

    // Check if subgroup exists
    const { data: subgroup, error: fetchError } = await supabase
      .from('ledger_subgroups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !subgroup) {
      return NextResponse.json(
        { error: 'Ledger subgroup not found' },
        { status: 404 }
      );
    }

    // Delete the subgroup (cascade will handle associated bills)
    const { error: deleteError } = await adminSupabase
      .from('ledger_subgroups')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete ledger subgroup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Ledger subgroup deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}