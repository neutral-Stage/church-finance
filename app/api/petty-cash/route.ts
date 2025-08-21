import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase';

// GET - Fetch all petty cash transactions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    let query = supabase
      .from('petty_cash')
      .select('*')
      .order('date', { ascending: false });

    // Apply filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: pettyCash, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch petty cash transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pettyCash });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new petty cash transaction
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
      type, 
      amount, 
      description, 
      date, 
      category, 
      recipient,
      fund_id 
    } = body;

    // Validate required fields
    if (!type || !amount || !description || !date) {
      return NextResponse.json(
        { error: 'Type, amount, description, and date are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['expense', 'replenishment'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "expense" or "replenishment"' },
        { status: 400 }
      );
    }

    // Create the petty cash transaction
    const { data: pettyCashTransaction, error: pettyCashError } = await adminSupabase
      .from('petty_cash')
      .insert({
        type,
        amount: parseFloat(amount),
        description,
        date,
        category: category || null,
        recipient: recipient || null,
        fund_id: fund_id || null,
      })
      .select()
      .single();

    if (pettyCashError) {
      return NextResponse.json(
        { error: 'Failed to create petty cash transaction' },
        { status: 500 }
      );
    }

    // If fund_id is provided, update the fund balance
    if (fund_id) {
      const amountChange = type === 'expense' ? -parseFloat(amount) : parseFloat(amount);
      
      const { error: fundError } = await adminSupabase.rpc('update_fund_balance', {
        fund_id: fund_id,
        amount_change: amountChange
      });

      if (fundError) {
        // Rollback the petty cash transaction creation
        await adminSupabase.from('petty_cash').delete().eq('id', pettyCashTransaction.id);
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        );
      }

      // Create a transaction record
      const transactionType = type === 'expense' ? 'expense' : 'income';
      const transactionDescription = type === 'expense' 
        ? `Petty cash expense: ${description}${recipient ? ' - ' + recipient : ''}`
        : `Petty cash replenishment: ${description}`;

      const { error: transactionError } = await adminSupabase
        .from('transactions')
        .insert({
          type: transactionType,
          amount: parseFloat(amount),
          description: transactionDescription,
          date,
          fund_id,
          reference_type: 'petty_cash',
          reference_id: pettyCashTransaction.id,
        });

      if (transactionError) {
        // Note: We don't rollback here as the petty cash and fund update are valid
      }
    }

    return NextResponse.json({ pettyCash: pettyCashTransaction }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update petty cash transaction
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
      type, 
      amount, 
      description, 
      date, 
      category, 
      recipient,
      fund_id 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Petty cash transaction ID is required' },
        { status: 400 }
      );
    }

    // Get the current petty cash transaction to calculate balance changes
    const { data: currentTransaction, error: fetchError } = await supabase
      .from('petty_cash')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentTransaction) {
      return NextResponse.json(
        { error: 'Petty cash transaction not found' },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !['expense', 'replenishment'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "expense" or "replenishment"' },
        { status: 400 }
      );
    }

    // Update the petty cash transaction
    const { data: pettyCashTransaction, error: updateError } = await adminSupabase
      .from('petty_cash')
      .update({
        type: type || currentTransaction.type,
        amount: amount !== undefined ? parseFloat(amount) : currentTransaction.amount,
        description: description || currentTransaction.description,
        date: date || currentTransaction.date,
        category: category !== undefined ? category : currentTransaction.category,
        recipient: recipient !== undefined ? recipient : currentTransaction.recipient,
        fund_id: fund_id !== undefined ? fund_id : currentTransaction.fund_id,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update petty cash transaction' },
        { status: 500 }
      );
    }

    // Handle fund balance changes if amount, type, or fund changed
    if (amount !== undefined || type !== undefined || fund_id !== undefined) {
      const oldType = currentTransaction.type;
      const newType = type || currentTransaction.type;
      const oldAmount = currentTransaction.amount;
      const newAmount = parseFloat(amount || currentTransaction.amount);
      const oldFundId = currentTransaction.fund_id;
      const newFundId = fund_id !== undefined ? fund_id : currentTransaction.fund_id;

      // Revert old fund balance if there was a fund
      if (oldFundId) {
        const oldAmountChange = oldType === 'expense' ? oldAmount : -oldAmount;
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: oldFundId,
          amount_change: oldAmountChange
        });
      }

      // Apply new fund balance if there is a fund
      if (newFundId) {
        const newAmountChange = newType === 'expense' ? -newAmount : newAmount;
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: newFundId,
          amount_change: newAmountChange
        });
      }

      // Update related transaction
      const transactionType = newType === 'expense' ? 'expense' : 'income';
      const transactionDescription = newType === 'expense' 
        ? `Petty cash expense: ${pettyCashTransaction.description}${pettyCashTransaction.recipient ? ' - ' + pettyCashTransaction.recipient : ''}`
        : `Petty cash replenishment: ${pettyCashTransaction.description}`;

      await adminSupabase
        .from('transactions')
        .update({
          type: transactionType,
          amount: newAmount,
          description: transactionDescription,
          date: pettyCashTransaction.date,
          fund_id: newFundId,
        })
        .eq('reference_type', 'petty_cash')
        .eq('reference_id', id);
    }

    return NextResponse.json({ pettyCash: pettyCashTransaction });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete petty cash transaction
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
        { error: 'Petty cash transaction ID is required' },
        { status: 400 }
      );
    }

    // Get the petty cash transaction to revert fund balance
    const { data: pettyCashTransaction, error: fetchError } = await supabase
      .from('petty_cash')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !pettyCashTransaction) {
      return NextResponse.json(
        { error: 'Petty cash transaction not found' },
        { status: 404 }
      );
    }

    // Delete the petty cash transaction
    const { error: deleteError } = await adminSupabase
      .from('petty_cash')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete petty cash transaction' },
        { status: 500 }
      );
    }

    // Revert fund balance if there was a fund
    if (pettyCashTransaction.fund_id) {
      const amountChange = pettyCashTransaction.type === 'expense' 
        ? pettyCashTransaction.amount 
        : -pettyCashTransaction.amount;
      
      await adminSupabase.rpc('update_fund_balance', {
        fund_id: pettyCashTransaction.fund_id,
        amount_change: amountChange
      });

      // Delete related transaction
      await adminSupabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'petty_cash')
        .eq('reference_id', id);
    }

    return NextResponse.json({ message: 'Petty cash transaction deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}