import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Database } from '@/types/database';
import { retrySupabaseQuery, logNetworkError, withTimeout } from '@/lib/retry-utils';

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
      .select(`
        *,
        offering_member:offering_member(
          member:members(*)
        )
      `)
      .order('service_date', { ascending: false });

    // Apply filters if provided
    if (startDate) {
      query = query.gte('service_date', startDate);
    }
    if (endDate) {
      query = query.lte('service_date', endDate);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: offerings, error } = await retrySupabaseQuery(
       () => query,
       {
         maxAttempts: 3,
         baseDelay: 1000,
         retryCondition: (error) => {
           const message = error?.message?.toLowerCase() || ''
           return (
             message.includes('failed to fetch') ||
             message.includes('timeout') ||
             message.includes('connection') ||
             message.includes('aborted')
           )
         }
       }
     )

    if (error) {
      logNetworkError(error, 'GET /api/offerings');
      return NextResponse.json(
        { 
          error: 'Failed to fetch offerings. Please check your connection and try again.',
          details: error.message 
        },
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
    const { amount, type, notes, service_date, fund_allocations, member_id } = body;

    // Validate required fields
    if (!amount || !type || !service_date || !member_id) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, type, service_date, member_id' },
        { status: 400 }
      );
    }

    // Convert fund IDs to fund names for fund_allocations
    const processedFundAllocations: Record<string, number> = {};
    if (fund_allocations && typeof fund_allocations === 'object') {
      // Get fund names for the provided fund IDs
      const fundIds = Object.keys(fund_allocations);
      if (fundIds.length > 0) {
        const { data: funds, error: fundsError } = await supabase
          .from('funds')
          .select('id, name')
          .in('id', fundIds);

        if (fundsError) {
          console.error('Error fetching funds:', fundsError);
          return NextResponse.json(
            { error: 'Failed to fetch fund information' },
            { status: 500 }
          );
        }

        // Create fund_allocations object with fund names as keys
        for (const fund of funds || []) {
          const allocation = fund_allocations[fund.id];
          if (typeof allocation === 'number' && allocation > 0) {
            processedFundAllocations[fund.name] = allocation;
          }
        }
      }
    }

    // Create the offering record
    const { data: offering, error: offeringError } = await supabase
      .from('offerings')
      .insert({
        amount: parseFloat(amount),
        type,
        notes: notes || null,
        service_date,
        fund_allocations: processedFundAllocations,
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

    // Create member relationship (now required)
    // The unique constraint on offering_id ensures only one member per offering
    const { error: memberError } = await supabase
      .from('offering_member')
      .insert({
        offering_id: offering.id,
        member_id: member_id
      });

    if (memberError) {
      console.error('Error creating member relationship:', memberError);
      // Check if it's a unique constraint violation
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'This offering already has a member assigned. Each offering can only have one member.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create member relationship' },
        { status: 500 }
      );
    }

    // Create transaction records for fund allocations
    if (fund_allocations && typeof fund_allocations === 'object') {
      // Get fund information for transaction records
      const fundIds = Object.keys(fund_allocations);
      if (fundIds.length > 0) {
        const { data: funds } = await supabase
          .from('funds')
          .select('id, name')
          .in('id', fundIds);

        for (const fund of funds || []) {
          const allocation = fund_allocations[fund.id];
          if (typeof allocation === 'number' && allocation > 0) {
            try {
              // Create transaction record
              await supabase
                .from('transactions')
                .insert({
                  type: 'income',
                  amount: allocation,
                  description: `Offering: ${type}${notes ? ' - ' + notes : ''}`,
                  category: 'Offering',
                  payment_method: 'cash',
                  fund_id: fund.id,
                  transaction_date: service_date
                });
            } catch (error) {
              console.error('Error creating transaction:', error);
            }
          }
        }
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
    const { id, amount, type, notes, service_date, fund_allocations, member_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Offering ID is required' },
        { status: 400 }
      );
    }

    // Get the current offering
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
        notes: notes !== undefined ? notes : currentOffering.notes,
        service_date: service_date || currentOffering.service_date,
        fund_allocations: fund_allocations !== undefined ? fund_allocations : currentOffering.fund_allocations,
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

    // Update member relationship (now required)
    if (member_id !== undefined) {
      if (!member_id) {
        return NextResponse.json(
          { error: 'Member ID is required' },
          { status: 400 }
        );
      }

      // Delete existing relationships
      await supabase
        .from('offering_member')
        .delete()
        .eq('offering_id', id);

      // Create new relationship
      // The unique constraint on offering_id ensures only one member per offering
      const { error: memberError } = await supabase
        .from('offering_member')
        .insert({
          offering_id: id,
          member_id: member_id
        });

      if (memberError) {
        console.error('Error updating member relationship:', memberError);
        // Check if it's a unique constraint violation
        if (memberError.code === '23505') {
          return NextResponse.json(
            { error: 'This offering already has a member assigned. Each offering can only have one member.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to update member relationship' },
          { status: 500 }
        );
      }
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

    // Delete member relationships first
    await supabase
      .from('offering_member')
      .delete()
      .eq('offering_id', id);

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

    // Revert fund balances based on allocations
    const fundAllocations = offering.fund_allocations as Record<string, number>;
    if (fundAllocations && typeof fundAllocations === 'object') {
      for (const [fundId, allocation] of Object.entries(fundAllocations)) {
        if (typeof allocation === 'number' && allocation > 0) {
          try {
            await supabase.rpc('update_fund_balance', {
              fund_id: fundId,
              amount_change: -allocation
            });

            // Delete related transactions
            await supabase
              .from('transactions')
              .delete()
              .eq('fund_id', fundId)
              .eq('transaction_date', offering.service_date)
              .eq('amount', allocation)
              .eq('category', 'Offering');
          } catch (error) {
            console.error('Error reverting fund balance:', error);
          }
        }
      }
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