import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET - Fetch all offerings
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    let query = supabase
      .from('offerings')
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

    const { data: offerings, error } = await query;

    if (error) {
      console.error('Error fetching offerings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch offerings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ offerings });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new offering
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { amount, type, description, date, fund_id } = body;

    // Validate required fields
    if (!amount || !type || !date) {
      return NextResponse.json(
        { error: 'Amount, type, and date are required' },
        { status: 400 }
      );
    }

    // Start a transaction
    const { data: offering, error: offeringError } = await supabase
      .from('offerings')
      .insert({
        amount: parseFloat(amount),
        type,
        description: description || null,
        date,
        fund_id: fund_id || null,
      })
      .select()
      .single();

    if (offeringError) {
      console.error('Error creating offering:', offeringError);
      return NextResponse.json(
        { error: 'Failed to create offering' },
        { status: 500 }
      );
    }

    // If fund_id is provided, update the fund balance
    if (fund_id) {
      const { error: fundError } = await supabase.rpc('update_fund_balance', {
        fund_id: fund_id,
        amount_change: parseFloat(amount)
      });

      if (fundError) {
        console.error('Error updating fund balance:', fundError);
        // Rollback the offering creation
        await supabase.from('offerings').delete().eq('id', offering.id);
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        );
      }

      // Create a transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          type: 'income',
          amount: parseFloat(amount),
          description: `Offering: ${type}${description ? ' - ' + description : ''}`,
          date,
          fund_id,
          reference_type: 'offering',
          reference_id: offering.id,
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // Note: We don't rollback here as the offering and fund update are valid
      }
    }

    return NextResponse.json({ offering }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update offering
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { id, amount, type, description, date, fund_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Offering ID is required' },
        { status: 400 }
      );
    }

    // Get the current offering to calculate balance changes
    const { data: currentOffering, error: fetchError } = await supabase
      .from('offerings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentOffering) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }

    // Update the offering
    const { data: offering, error: updateError } = await supabase
      .from('offerings')
      .update({
        amount: amount !== undefined ? parseFloat(amount) : currentOffering.amount,
        type: type || currentOffering.type,
        description: description !== undefined ? description : currentOffering.description,
        date: date || currentOffering.date,
        fund_id: fund_id !== undefined ? fund_id : currentOffering.fund_id,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offering:', updateError);
      return NextResponse.json(
        { error: 'Failed to update offering' },
        { status: 500 }
      );
    }

    // Handle fund balance changes if amount or fund changed
    if (amount !== undefined || fund_id !== undefined) {
      const oldAmount = currentOffering.amount;
      const newAmount = parseFloat(amount || currentOffering.amount);
      const oldFundId = currentOffering.fund_id;
      const newFundId = fund_id !== undefined ? fund_id : currentOffering.fund_id;

      // Revert old fund balance if there was a fund
      if (oldFundId) {
        await supabase.rpc('update_fund_balance', {
          fund_id: oldFundId,
          amount_change: -oldAmount
        });
      }

      // Apply new fund balance if there is a fund
      if (newFundId) {
        await supabase.rpc('update_fund_balance', {
          fund_id: newFundId,
          amount_change: newAmount
        });
      }

      // Update related transaction
      await supabase
        .from('transactions')
        .update({
          amount: newAmount,
          description: `Offering: ${offering.type}${offering.description ? ' - ' + offering.description : ''}`,
          date: offering.date,
          fund_id: newFundId,
        })
        .eq('reference_type', 'offering')
        .eq('reference_id', id);
    }

    return NextResponse.json({ offering });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete offering
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Offering ID is required' },
        { status: 400 }
      );
    }

    // Get the offering to revert fund balance
    const { data: offering, error: fetchError } = await supabase
      .from('offerings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !offering) {
      return NextResponse.json(
        { error: 'Offering not found' },
        { status: 404 }
      );
    }

    // Delete the offering
    const { error: deleteError } = await supabase
      .from('offerings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting offering:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete offering' },
        { status: 500 }
      );
    }

    // Revert fund balance if there was a fund
    if (offering.fund_id) {
      await supabase.rpc('update_fund_balance', {
        fund_id: offering.fund_id,
        amount_change: -offering.amount
      });

      // Delete related transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('reference_type', 'offering')
        .eq('reference_id', id);
    }

    return NextResponse.json({ message: 'Offering deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}