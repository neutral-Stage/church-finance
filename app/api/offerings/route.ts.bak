import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase';
import { retrySupabaseQuery, logNetworkError } from '@/lib/retry-utils';

// GET - Fetch all offerings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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
       async () => {
         const { data, error } = await query;
         return { data, error };
       },
       {
         maxAttempts: 3,
         baseDelay: 1000,
         retryCondition: (error: unknown) => {
           const message = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') 
             ? error.message.toLowerCase() 
             : ''
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
      logNetworkError();
      return NextResponse.json(
        { 
          error: 'Failed to fetch offerings. Please check your connection and try again.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ offerings });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new offering
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    const body = await request.json();
    const { amount, type, notes, service_date, fund_allocations, member_id } = body;

    // Check user authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { error: 'Offering type is required' },
        { status: 400 }
      );
    }
    if (!service_date) {
      return NextResponse.json(
        { error: 'Service date is required' },
        { status: 400 }
      );
    }
    if (!member_id || member_id === 'none') {
      return NextResponse.json(
        { error: 'Please select a member for this offering' },
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

    // Create the offering record using admin client to bypass RLS
    const { data: offering, error: offeringError } = await adminSupabase
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
      return NextResponse.json(
        { error: 'Failed to create offering', details: offeringError.message },
        { status: 500 }
      );
    }

    // Create member relationship (now required)
    // The unique constraint on offering_id ensures only one member per offering
    const { error: memberError } = await adminSupabase
      .from('offering_member')
      .insert({
        offering_id: offering.id,
        member_id: member_id
      });

    if (memberError) {
      // Check if it's a unique constraint violation
      if (memberError.code === '23505') {
        return NextResponse.json(
          { error: 'This offering already has a member assigned. Each offering can only have one member.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create member relationship', details: memberError.message },
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
              await adminSupabase
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
            } catch {
              // Transaction creation failed, but continue
            }
          }
        }
      }
    }

    return NextResponse.json({ offering }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update offering
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const adminSupabase = createAdminClient();
    const body = await request.json();
    
    // Check user authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
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

    // Update the offering using admin client
    const { data: offering, error: updateError } = await adminSupabase
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
      await adminSupabase
        .from('offering_member')
        .delete()
        .eq('offering_id', id);

      // Create new relationship
      // The unique constraint on offering_id ensures only one member per offering
      const { error: memberError } = await adminSupabase
        .from('offering_member')
        .insert({
          offering_id: id,
          member_id: member_id
        });

      if (memberError) {
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
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete offering
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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
          } catch {
            // Fund balance revert failed, but continue
          }
        }
      }
    }

    return NextResponse.json({ message: 'Offering deleted successfully' });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}