import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { safeSelect, safeInsert, safeUpdate, safeDelete, safeRpc } from '@/lib/supabase-helpers';

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

// GET - Fetch all bills
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    // Get all bills and filter in memory if needed
    const result = await safeSelect(supabase, 'bills', {
      order: { column: 'due_date', ascending: false }
    });

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      );
    }

    let bills = result.data || [];

    // Apply filters
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (status) {
      bills = bills.filter((bill: any) => bill.status === status);
    }
    if (category) {
      bills = bills.filter((bill: any) => bill.category === category);
    }
    if (startDate) {
      bills = bills.filter((bill: any) => bill.due_date >= startDate);
    }
    if (endDate) {
      bills = bills.filter((bill: any) => bill.due_date <= endDate);
    }

    return NextResponse.json({
      bills,
      success: true
    });
  } catch (error) {
    console.error('Bills API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new bill
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json();
    const {
      vendor_name,
      vendor, // Support legacy field name
      amount,
      category,
      due_date,
      status = 'pending',
      fund_id,
      notes,
      frequency = 'one-time',
      church_id
    } = body;

    // Handle legacy vendor field
    const finalVendorName = vendor_name || vendor;

    // Validate required fields
    if (!finalVendorName || !amount || !due_date) {
      return NextResponse.json(
        { error: 'Vendor name, amount, and due date are required' },
        { status: 400 }
      );
    }

    // Create the bill using safe insert
    const billData = {
      vendor_name: finalVendorName,
      amount: parseFloat(amount),
      category: category || 'General',
      due_date,
      status,
      fund_id: fund_id || null,
      notes: notes || null,
      frequency,
      church_id: church_id || user.user_metadata?.church_id
    };

    const result = await safeInsert(adminSupabase, 'bills', billData);

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to create bill' },
        { status: 500 }
      );
    }

    const bill = result.data?.[0];

    return NextResponse.json({
      bill,
      success: true
    }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update bill
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json();
    const {
      id,
      vendor_name,
      vendor,
      amount,
      category,
      due_date,
      status,
      fund_id,
      notes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Get the current bill
    const currentBillResult = await safeSelect(supabase, 'bills', {
      filter: { column: 'id', value: id }
    });

    if (currentBillResult.error || !currentBillResult.data || currentBillResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    const currentBill = currentBillResult.data[0];

    // Prepare update data
    const updateData: any = {};

    if (vendor_name !== undefined) updateData.vendor_name = vendor_name;
    if (vendor !== undefined && !vendor_name) updateData.vendor_name = vendor; // Legacy support
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category !== undefined) updateData.category = category;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (status !== undefined) updateData.status = status;
    if (fund_id !== undefined) updateData.fund_id = fund_id;
    if (notes !== undefined) updateData.notes = notes;

    const result = await safeUpdate(adminSupabase, 'bills', updateData, {
      column: 'id',
      value: id
    });

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to update bill' },
        { status: 500 }
      );
    }

    const bill = result.data?.[0];

    return NextResponse.json({ bill });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete bill
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Delete the bill
    const result = await safeDelete(adminSupabase, 'bills', {
      column: 'id',
      value: id
    });

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to delete bill' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}