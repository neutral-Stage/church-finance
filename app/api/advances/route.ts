import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { typedQuery, extractProperty, extractId, extractAmount } from '@/lib/supabase-type-fix';
import { safeSelect, safeUpdate, safeDelete, safeRpc } from '@/lib/supabase-helpers';
import type { Database } from '@/types/database';

type Advance = Database['public']['Tables']['advances']['Row'];

// GET - Fetch all advances
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const recipient = searchParams.get('recipient');

    // Fetch all advances and apply filters in memory
    const { data: allAdvances, error } = await typedQuery<Advance[]>(
      supabase.from('advances').select('*').order('advance_date', { ascending: false })
    );

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch advances' },
        { status: 500 }
      );
    }

    // Apply filters in memory
    let advances = allAdvances || [];

    if (startDate) {
      advances = advances.filter(a => extractProperty(a, 'advance_date') >= startDate);
    }
    if (endDate) {
      advances = advances.filter(a => extractProperty(a, 'advance_date') <= endDate);
    }
    if (status) {
      advances = advances.filter(a => extractProperty(a, 'status') === status);
    }
    if (recipient) {
      advances = advances.filter(a =>
        extractProperty(a, 'recipient_name', '').toLowerCase().includes(recipient.toLowerCase())
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
      const { data: advance, error: _fetchError } = await typedQuery<Advance[]>(
        supabase.from('advances').select('*').eq('id', advance_id)
      );

      if (_fetchError || !advance || advance.length === 0) {
        return NextResponse.json(
          { error: 'Advance not found' },
          { status: 404 }
        );
      }

      const currentAdvance = advance[0];
      const newRepaidAmount = (extractAmount(currentAdvance) || 0) + parseFloat(repayment_amount);
      const newStatus = newRepaidAmount >= extractAmount(currentAdvance) ? 'repaid' : 'partial';

      // Update the advance
      const { data: updatedAdvance, error: _updateError } = await typedQuery<Advance[]>(
        adminSupabase
          .from('advances')
          .update({
            amount_returned: newRepaidAmount,
            status: newStatus
          })
          .eq('id', advance_id)
          .select()
      );

      if (_updateError || !updatedAdvance || updatedAdvance.length === 0) {
        return NextResponse.json(
          { error: 'Failed to update advance' },
          { status: 500 }
        );
      }

      const updatedAdvanceRecord = updatedAdvance[0];

      // Update fund balance (add money back)
      const fundId = extractProperty(currentAdvance, 'fund_id');
      if (fundId) {
        await adminSupabase.rpc('update_fund_balance', {
          fund_id: fundId,
          amount_change: parseFloat(repayment_amount)
        });

        // Create a transaction record for repayment
        await typedQuery(
          adminSupabase.from('transactions').insert({
            type: 'income',
            amount: parseFloat(repayment_amount),
            description: `Advance repayment from ${extractProperty(currentAdvance, 'recipient_name')}${extractProperty(currentAdvance, 'purpose') ? ' - ' + extractProperty(currentAdvance, 'purpose') : ''}`,
            transaction_date: repayment_date || new Date().toISOString().split('T')[0],
            fund_id: fundId,
            category: 'Advance Repayment',
            payment_method: 'Cash'
          })
        );
      }

      return NextResponse.json({ advance: updatedAdvanceRecord }, { status: 200 });
    }

    // Handle creating new advance
    if (!recipient_name || !amount || !advance_date) {
      return NextResponse.json(
        { error: 'Recipient, amount, and date are required' },
        { status: 400 }
      );
    }

    // Create the advance
    const { data: advance, error: _advanceError } = await typedQuery<Advance[]>(
      adminSupabase.from('advances').insert({
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
      }).select()
    );

    if (_advanceError || !advance || advance.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create advance' },
        { status: 500 }
      );
    }

    const newAdvance = advance[0];

    // For outstanding advances, update fund balance and create transaction
    if (status === 'outstanding' && fund_id) {
      const { error: _fundError } = await adminSupabase.rpc('update_fund_balance', {
        fund_id: fund_id,
        amount_change: -parseFloat(amount)
      });

      if (_fundError) {
        // Rollback the advance creation
        await adminSupabase.from('advances').delete().eq('id', extractId(newAdvance));
        return NextResponse.json(
          { error: 'Failed to update fund balance' },
          { status: 500 }
        );
      }

      // Create a transaction record
      await typedQuery(
        adminSupabase.from('transactions').insert({
          type: 'expense',
          amount: parseFloat(amount),
          description: `Advance to ${recipient_name}${purpose ? ' - ' + purpose : ''}`,
          transaction_date: advance_date,
          fund_id,
          category: 'Advance',
          payment_method: 'cash'
        })
      );
    }

    return NextResponse.json({ advance: newAdvance }, { status: 201 });
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
    const { data: currentAdvanceData, error: _fetchError } = await typedQuery<Advance[]>(
      supabase.from('advances').select('*').eq('id', id)
    );

    if (_fetchError || !currentAdvanceData || currentAdvanceData.length === 0) {
      return NextResponse.json(
        { error: 'Advance not found' },
        { status: 404 }
      );
    }

    const currentAdvance = currentAdvanceData[0];

    // Update the advance
    const { data: advance, error: _updateError } = await typedQuery<Advance[]>(
      adminSupabase.from('advances').update({
        recipient_name: recipient_name || extractProperty(currentAdvance, 'recipient_name'),
        amount: amount !== undefined ? parseFloat(amount) : extractAmount(currentAdvance),
        purpose: purpose !== undefined ? purpose : extractProperty(currentAdvance, 'purpose'),
        advance_date: advance_date || extractProperty(currentAdvance, 'advance_date'),
        expected_return_date: expected_return_date !== undefined ? expected_return_date : extractProperty(currentAdvance, 'expected_return_date'),
        status: status || extractProperty(currentAdvance, 'status'),
        fund_id: fund_id !== undefined ? fund_id : extractProperty(currentAdvance, 'fund_id'),
      }).eq('id', id).select()
    );

    if (_updateError || !advance || advance.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update advance' },
        { status: 500 }
      );
    }

    const updatedAdvance = advance[0];

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
        await safeRpc(adminSupabase, 'update_fund_balance', {
          fund_id: oldFundId,
          amount_change: oldAmount
        });
      }

      // Apply new fund balance
      if (newFundId) {
        await safeRpc(adminSupabase, 'update_fund_balance', {
          fund_id: newFundId,
          amount_change: -newAmount
        });
      }

      // Update the transaction (using a safe approach by filtering manually)
      const { data: transactions } = await safeSelect(adminSupabase, 'transactions', {
        filter: { column: 'category', value: 'Advance' }
      });

      if (transactions) {
        const relatedTransaction = transactions.find(t =>
          t.description?.includes(`Advance to ${currentAdvance.recipient_name}`)
        );

        if (relatedTransaction) {
          await safeUpdate(adminSupabase, 'transactions', {
            amount: newAmount,
            description: `Advance to ${updatedAdvance.recipient_name}${updatedAdvance.purpose ? ' - ' + updatedAdvance.purpose : ''}`,
            fund_id: newFundId,
          }, { column: 'id', value: relatedTransaction.id });
        }
      }
    }

    return NextResponse.json({ advance: updatedAdvance });
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
    const { data: advanceData, error: _fetchError } = await safeSelect(supabase, 'advances', {
      filter: { column: 'id', value: id }
    });

    if (_fetchError || !advanceData || advanceData.length === 0) {
      return NextResponse.json(
        { error: 'Advance not found' },
        { status: 404 }
      );
    }

    const advance = advanceData[0];

    // Delete the advance
    const { error: _deleteError } = await safeDelete(adminSupabase, 'advances', {
      column: 'id',
      value: id
    });

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
        await safeRpc(adminSupabase, 'update_fund_balance', {
          fund_id: advance.fund_id,
          amount_change: netAmount
        });
      }

      // Delete related transactions - using description filtering since we don't have reference fields
      const { data: allTransactions } = await safeSelect(adminSupabase, 'transactions');
      if (allTransactions) {
        const relatedTransactions = allTransactions.filter(t =>
          t.description?.includes(`Advance to ${advance.recipient_name}`) ||
          t.description?.includes(`Advance repayment from ${advance.recipient_name}`)
        );

        for (const transaction of relatedTransactions) {
          await safeDelete(adminSupabase, 'transactions', {
            column: 'id',
            value: transaction.id
          });
        }
      }
    }

    return NextResponse.json({ message: 'Advance deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}