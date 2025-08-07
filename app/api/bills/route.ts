import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET - Fetch all bills
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let query = supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true });

    // Apply filters if provided
    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    if (endDate) {
      query = query.lte('due_date', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: bills, error } = await query;

    if (error) {
      console.error('Error fetching bills:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bills });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new bill
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { 
      vendor, 
      amount, 
      description, 
      due_date, 
      category, 
      status = 'pending',
      fund_id 
    } = body;

    // Validate required fields
    if (!vendor || !amount || !due_date) {
      return NextResponse.json(
        { error: 'Vendor, amount, and due date are required' },
        { status: 400 }
      );
    }

    // Create the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        vendor,
        amount: parseFloat(amount),
        description: description || null,
        due_date,
        category: category || null,
        status,
        fund_id: fund_id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (billError) {
      console.error('Error creating bill:', billError);
      return NextResponse.json(
        { error: 'Failed to create bill' },
        { status: 500 }
      );
    }

    // If status is 'paid' and fund_id is provided, update fund balance and create transaction
    if (status === 'paid' && fund_id) {
      const { error: fundError } = await supabase.rpc('update_fund_balance', {
        fund_id: fund_id,
        amount_change: -parseFloat(amount)
      });

      if (fundError) {
        console.error('Error updating fund balance:', fundError);
        // Rollback the bill creation
        await supabase.from('bills').delete().eq('id', bill.id);
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        );
      }

      // Create a transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: parseFloat(amount),
          description: `Bill payment: ${vendor}${description ? ' - ' + description : ''}`,
          date: new Date().toISOString().split('T')[0],
          fund_id,
          reference_type: 'bill',
          reference_id: bill.id,
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // Note: We don't rollback here as the bill and fund update are valid
      }
    }

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update bill
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { 
      id, 
      vendor, 
      amount, 
      description, 
      due_date, 
      category, 
      status, 
      fund_id,
      paid_date 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Get the current bill to handle status and fund changes
    const { data: currentBill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentBill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Update the bill
    const updateData: Record<string, unknown> = {
      vendor: vendor || currentBill.vendor,
      amount: amount !== undefined ? parseFloat(amount) : currentBill.amount,
      description: description !== undefined ? description : currentBill.description,
      due_date: due_date || currentBill.due_date,
      category: category !== undefined ? category : currentBill.category,
      status: status || currentBill.status,
      fund_id: fund_id !== undefined ? fund_id : currentBill.fund_id,
    };

    // Set paid_date if status is changing to paid
    if (status === 'paid' && currentBill.status !== 'paid') {
      updateData.paid_date = paid_date || new Date().toISOString().split('T')[0];
    } else if (status !== 'paid') {
      updateData.paid_date = null;
    }

    const { data: bill, error: updateError } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bill:', updateError);
      return NextResponse.json(
        { error: 'Failed to update bill' },
        { status: 500 }
      );
    }

    // Handle fund balance changes based on status changes
    const oldStatus = currentBill.status;
    const newStatus = status || currentBill.status;
    const oldAmount = currentBill.amount;
    const newAmount = parseFloat(amount || currentBill.amount);
    const oldFundId = currentBill.fund_id;
    const newFundId = fund_id !== undefined ? fund_id : currentBill.fund_id;

    // If status changed from paid to unpaid, revert the fund balance
    if (oldStatus === 'paid' && newStatus !== 'paid' && oldFundId) {
      await supabase.rpc('update_fund_balance', {
        fund_id: oldFundId,
        amount_change: oldAmount
      });

      // Delete the transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'bill')
        .eq('reference_id', id);
    }
    // If status changed from unpaid to paid, deduct from fund balance
    else if (oldStatus !== 'paid' && newStatus === 'paid' && newFundId) {
      await supabase.rpc('update_fund_balance', {
        fund_id: newFundId,
        amount_change: -newAmount
      });

      // Create a transaction
      await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: newAmount,
          description: `Bill payment: ${bill.vendor}${bill.description ? ' - ' + bill.description : ''}`,
          date: bill.paid_date || new Date().toISOString().split('T')[0],
          fund_id: newFundId,
          reference_type: 'bill',
          reference_id: id,
        });
    }
    // If bill is paid and amount or fund changed, update accordingly
    else if (newStatus === 'paid' && (amount !== undefined || fund_id !== undefined)) {
      // Revert old fund balance
      if (oldFundId) {
        await supabase.rpc('update_fund_balance', {
          fund_id: oldFundId,
          amount_change: oldAmount
        });
      }

      // Apply new fund balance
      if (newFundId) {
        await supabase.rpc('update_fund_balance', {
          fund_id: newFundId,
          amount_change: -newAmount
        });
      }

      // Update the transaction
      await supabase
        .from('transactions')
        .update({
          amount: newAmount,
          description: `Bill payment: ${bill.vendor}${bill.description ? ' - ' + bill.description : ''}`,
          fund_id: newFundId,
        })
        .eq('reference_type', 'bill')
        .eq('reference_id', id);
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete bill
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Get the bill to revert fund balance if it was paid
    const { data: bill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Delete the bill
    const { error: deleteError } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting bill:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete bill' },
        { status: 500 }
      );
    }

    // If the bill was paid, revert the fund balance
    if (bill.status === 'paid' && bill.fund_id) {
      await supabase.rpc('update_fund_balance', {
        fund_id: bill.fund_id,
        amount_change: bill.amount
      });

      // Delete related transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'bill')
        .eq('reference_id', id);
    }

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}