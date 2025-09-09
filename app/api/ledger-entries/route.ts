import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';

// GET - Fetch all ledger entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const approval_status = searchParams.get('approval_status');
    const include_subgroups = searchParams.get('include_subgroups') === 'true';
    const include_bills = searchParams.get('include_bills') === 'true';

    let query = supabase
      .from('ledger_entries')
      .select(`
        *,
        ${include_subgroups ? `
          ledger_subgroups (
            *,
            ${include_bills ? 'bills (*)' : ''}
          ),
        ` : ''}
        ${include_bills ? 'bills (*)' : ''}
      `)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (approval_status) {
      query = query.eq('approval_status', approval_status);
    }

    const { data: ledgerEntries, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch ledger entries' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ledgerEntries });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new ledger entry
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
      title, 
      description, 
      status = 'draft',
      default_due_date,
      default_fund_id,
      responsible_parties,
      priority = 'medium',
      approval_status = 'pending',
      notes,
      metadata = {}
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create the ledger entry
    const { data: ledgerEntry, error: ledgerError } = await adminSupabase
      .from('ledger_entries')
      .insert({
        title,
        description: description || null,
        status,
        default_due_date: default_due_date || new Date().toISOString().split('T')[0],
        default_fund_id: default_fund_id || null,
        responsible_parties: responsible_parties || null,
        priority,
        approval_status,
        notes: notes || null,
        metadata,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ledgerError) {
      return NextResponse.json(
        { error: 'Failed to create ledger entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ledgerEntry }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update ledger entry
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
      status, 
      default_due_date,
      default_fund_id,
      responsible_parties,
      priority,
      approval_status,
      notes,
      metadata
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Ledger entry ID is required' },
        { status: 400 }
      );
    }

    // Get the current ledger entry
    const { data: currentEntry, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentEntry) {
      return NextResponse.json(
        { error: 'Ledger entry not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      title: title || currentEntry.title,
      description: description !== undefined ? description : currentEntry.description,
      status: status || currentEntry.status,
      default_due_date: default_due_date || currentEntry.default_due_date,
      default_fund_id: default_fund_id !== undefined ? default_fund_id : currentEntry.default_fund_id,
      responsible_parties: responsible_parties !== undefined ? responsible_parties : currentEntry.responsible_parties,
      priority: priority || currentEntry.priority,
      approval_status: approval_status || currentEntry.approval_status,
      notes: notes !== undefined ? notes : currentEntry.notes,
      metadata: metadata !== undefined ? metadata : currentEntry.metadata,
      updated_at: new Date().toISOString(),
    };

    // Handle approval status changes
    if (approval_status === 'approved' && currentEntry.approval_status !== 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    } else if (approval_status !== 'approved') {
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    const { data: ledgerEntry, error: updateError } = await adminSupabase
      .from('ledger_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update ledger entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ledgerEntry });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete ledger entry
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
        { error: 'Ledger entry ID is required' },
        { status: 400 }
      );
    }

    // Check if ledger entry exists
    const { data: ledgerEntry, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !ledgerEntry) {
      return NextResponse.json(
        { error: 'Ledger entry not found' },
        { status: 404 }
      );
    }

    // Delete the ledger entry (cascade will handle subgroups and bills)
    const { error: deleteError } = await adminSupabase
      .from('ledger_entries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete ledger entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Ledger entry deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}