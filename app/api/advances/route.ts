import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';

// GET - Fetch all advances
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const recipient = searchParams.get('recipient');

    let query = supabase
      .from('advances')
      .select('*')
      .order('date', { ascending: false });

    // Apply filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (recipient) {
      query = query.ilike('recipient_name', `%${recipient}%`);
    }

    const { data: advances, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch advances' },
        { status: 500 }
      );
    }

    return NextResponse.json({ advances });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new advance or process repayment
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
      recipient_name, 
      amount, 
      purpose, 
      advance_date, 
      expected_return_date, 
      status = 'outstanding',
      fund_id,
      action = 'create' // 'create' or 'repay'
    } = body;

    if (action === 'repay') {
      // Handle repayment
      const { advance_id, repayment_amount, repayment_date } = body;
      
      if (!advance_id || !repayment_amount) {
        return NextResponse.json(
          { error: 'Advance ID and repayment amount are required for repayment' },
          { status: 400 }
        );
      }

      // Get the advance to update
      const { data: advance, error: _fetchError } = await supabase
        .from('advances')
        .select('*')
        .eq('id', advance_id)
        .single();

      if (_fetchError || !advance) {
        return NextResponse.json(
          { error: 'Advance not found' },
          { status: 404 }
        );
      }

      const newRepaidAmount = (advance.repaid_amount || 0) + parseFloat(repayment_amount);
      const newStatus = newRepaidAmount >= advance.amount ? 'repaid' : 'partial';

      // Update the advance
      const { data: updatedAdvance, error: _updateError } = await adminSupabase
        .from('advances')
        .update({
          repaid_amount: newRepaidAmount,
          status: newStatus,
          repaid_date: newStatus === 'repaid' ? (repayment_date || new Date().toISOString().split('T')[0]) : advance.repaid_date
        })
        .eq('id', advance_id)
        .select()
        .single();

      if (_updateError) {
        return NextResponse.json(
          { error: 'Failed to update advance' },
          { status: 500 }
        );
      }

      // Update fund balance (add money back)
      if (advance.fund_id) {
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: advance.fund_id,
          amount_change: parseFloat(repayment_amount)
        });

        // Create a transaction record for repayment
        await adminSupabase
          .from('transactions')
          .insert({
            type: 'income',
            amount: parseFloat(repayment_amount),
            description: `Advance repayment from ${advance.recipient_name}${advance.purpose ? ' - ' + advance.purpose : ''}`,
            date: repayment_date || new Date().toISOString().split('T')[0],
            fund_id: advance.fund_id,
            reference_type: 'advance_repayment',
            reference_id: advance_id,
          });
      }

      return NextResponse.json({ advance: updatedAdvance }, { status: 200 });
    }

    // Handle creating new advance
    if (!recipient_name || !amount || !advance_date) {
      return NextResponse.json(
        { error: 'Recipient, amount, and date are required' },
        { status: 400 }
      );
    }

    // Create the advance
    const { data: advance, error: _advanceError } = await adminSupabase
      .from('advances')
      .insert({
        recipient_name,
        amount: parseFloat(amount),
        purpose: purpose || null,
        advance_date,
        expected_return_date: expected_return_date || null,
        status,
        fund_id: fund_id || null,
        amount_returned: 0,
        payment_method: 'cash',
        approved_by: 'system'
      })
      .select()
      .single();

    if (_advanceError) {
      return NextResponse.json(
        { error: 'Failed to create advance' },
        { status: 500 }
      );
    }

    // For outstanding advances, update fund balance and create transaction
    if (status === 'outstanding' && fund_id) {
      const { error: _fundError } = await adminSupabase.rpc('update_fund_balance', {
        fund_id: fund_id,
        amount_change: -parseFloat(amount)
      });

      if (_fundError) {
        // Rollback the advance creation
        await supabase.from('advances').delete().eq('id', advance.id);
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        );
      }

      // Create a transaction record
      const { error: _transactionError } = await adminSupabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: parseFloat(amount),
          description: `Advance to ${recipient_name}${purpose ? ' - ' + purpose : ''}`,
          transaction_date: advance_date,
          fund_id,
          reference_type: 'advance',
          reference_id: advance.id,
          payment_method: 'cash',
          approved_by: 'system'
        });

      if (_transactionError) {
        // Note: We don't rollback here as the advance and fund update are valid
      }
    }

    return NextResponse.json({ advance }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update advance
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
      recipient_name, 
      amount, 
      purpose, 
      advance_date, 
      expected_return_date, 
      status, 
      fund_id 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Advance ID is required' },
        { status: 400 }
      );
    }

    // Get the current advance to handle status and fund changes
    const { data: currentAdvance, error: _fetchError } = await supabase
      .from('advances')
      .select('*')
      .eq('id', id)
      .single();

    if (_fetchError || !currentAdvance) {
      return NextResponse.json(
        { error: 'Advance not found' },
        { status: 404 }
      );
    }

    // Update the advance
    const { data: advance, error: _updateError } = await adminSupabase
      .from('advances')
      .update({
        recipient_name: recipient_name || currentAdvance.recipient_name,
        amount: amount !== undefined ? parseFloat(amount) : currentAdvance.amount,
        purpose: purpose !== undefined ? purpose : currentAdvance.purpose,
        advance_date: advance_date || currentAdvance.advance_date,
        expected_return_date: expected_return_date !== undefined ? expected_return_date : currentAdvance.expected_return_date,
        status: status || currentAdvance.status,
        fund_id: fund_id !== undefined ? fund_id : currentAdvance.fund_id,
      })
      .eq('id', id)
      .select()
      .single();

    if (_updateError) {
      return NextResponse.json(
        { error: 'Failed to update advance' },
        { status: 500 }
      );
    }

    // Handle fund balance changes based on status changes
    const newStatus = status || currentAdvance.status;
    const oldAmount = currentAdvance.amount;
    const newAmount = parseFloat(amount || currentAdvance.amount);
    const oldFundId = currentAdvance.fund_id;
    const newFundId = fund_id !== undefined ? fund_id : currentAdvance.fund_id;

    // If advance amount or fund changed for outstanding advances, update accordingly
    if (newStatus === 'outstanding' && (amount !== undefined || fund_id !== undefined)) {
      // Revert old fund balance
      if (oldFundId) {
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: oldFundId,
          amount_change: oldAmount
        });
      }

      // Apply new fund balance
      if (newFundId) {
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: newFundId,
          amount_change: -newAmount
        });
      }

      // Update the transaction
      await adminSupabase
        .from('transactions')
        .update({
          amount: newAmount,
          description: `Advance to ${advance.recipient_name}${advance.purpose ? ' - ' + advance.purpose : ''}`,
          fund_id: newFundId,
        })
        .eq('reference_type', 'advance')
        .eq('reference_id', id);
    }

    return NextResponse.json({ advance });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete advance
export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Advance ID is required' },
        { status: 400 }
      );
    }

    // Get the advance to revert fund balance if it was approved
    const { data: advance, error: _fetchError } = await supabase
      .from('advances')
      .select('*')
      .eq('id', id)
      .single();

    if (_fetchError || !advance) {
      return NextResponse.json(
        { error: 'Advance not found' },
        { status: 404 }
      );
    }

    // Delete the advance
    const { error: _deleteError } = await adminSupabase
      .from('advances')
      .delete()
      .eq('id', id);

    if (_deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete advance' },
        { status: 500 }
      );
    }

    // If the advance was outstanding, revert the fund balance
    if (advance.status === 'outstanding' && advance.fund_id) {
      // Add back the advance amount minus any repayments
      const netAmount = advance.amount - (advance.amount_returned || 0);
      if (netAmount > 0) {
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: advance.fund_id,
          amount_change: netAmount
        });
      }

      // Delete related transactions
      await adminSupabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'advance')
        .eq('reference_id', id);

      await adminSupabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'advance_repayment')
        .eq('reference_id', id);
    }

    return NextResponse.json({ message: 'Advance deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}