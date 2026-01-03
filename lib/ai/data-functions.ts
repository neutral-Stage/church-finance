// Data Functions - Execute data operations for AI function calls
import { createClient } from '@supabase/supabase-js';
import { format, subDays, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';

// Create admin client for server-side operations
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    return createClient(supabaseUrl, serviceRoleKey);
}

export interface FunctionContext {
    churchId: string;
    userId: string;
}

// Execute a function call from the AI
export async function executeFunctionCall(
    functionName: string,
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const handlers: Record<string, (args: Record<string, unknown>, ctx: FunctionContext) => Promise<unknown>> = {
        get_fund_balances: getFundBalances,
        get_transactions: getTransactions,
        get_offerings: getOfferings,
        get_bills: getBills,
        get_advances: getAdvances,
        get_financial_summary: getFinancialSummary,
        search_records: searchRecords,
        create_transaction: createTransaction,
        create_offering: createOffering,
    };

    const handler = handlers[functionName];
    if (!handler) {
        throw new Error(`Unknown function: ${functionName}`);
    }

    return handler(args, context);
}

// Get fund balances
async function getFundBalances(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    let query = supabase
        .from('funds')
        .select('id, name, current_balance, fund_type, description')
        .eq('church_id', context.churchId)
        .eq('is_active', true);

    if (args.fund_name) {
        query = query.ilike('name', `%${args.fund_name}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
        funds: data,
        total_balance: data?.reduce((sum, f) => sum + (f.current_balance || 0), 0) || 0,
    };
}

// Get transactions with filters
async function getTransactions(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    let query = supabase
        .from('transactions')
        .select(`
      id, type, amount, description, category, payment_method, 
      transaction_date, receipt_number, created_at,
      funds!inner(id, name, church_id)
    `)
        .eq('funds.church_id', context.churchId)
        .order('transaction_date', { ascending: false });

    if (args.type) {
        query = query.eq('type', args.type);
    }

    if (args.category) {
        query = query.ilike('category', `%${args.category}%`);
    }

    if (args.start_date) {
        query = query.gte('transaction_date', args.start_date as string);
    }

    if (args.end_date) {
        query = query.lte('transaction_date', args.end_date as string);
    }

    const limit = (args.limit as number) || 10;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    // Calculate summary
    const income = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
    const expense = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

    return {
        transactions: data,
        summary: {
            total_income: income,
            total_expense: expense,
            net: income - expense,
            count: data?.length || 0,
        },
    };
}

// Get offerings with filters
async function getOfferings(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    // Note: offerings may need church filtering based on your schema
    let query = supabase
        .from('offerings')
        .select('*')
        .order('service_date', { ascending: false });

    if (args.type) {
        query = query.eq('type', args.type);
    }

    if (args.start_date) {
        query = query.gte('service_date', args.start_date as string);
    }

    if (args.end_date) {
        query = query.lte('service_date', args.end_date as string);
    }

    const limit = (args.limit as number) || 10;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    const totalAmount = data?.reduce((sum, o) => sum + o.amount, 0) || 0;

    return {
        offerings: data,
        summary: {
            total_amount: totalAmount,
            count: data?.length || 0,
        },
    };
}

// Get bills with filters
async function getBills(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    let query = supabase
        .from('bills')
        .select(`
      id, vendor_name, amount, due_date, frequency, status, category,
      priority, notes, created_at,
      funds!inner(id, name, church_id)
    `)
        .eq('funds.church_id', context.churchId)
        .order('due_date', { ascending: true });

    if (args.status) {
        query = query.eq('status', args.status);
    }

    if (args.category) {
        query = query.ilike('category', `%${args.category}%`);
    }

    const limit = (args.limit as number) || 10;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    const pendingAmount = data?.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0) || 0;
    const overdueAmount = data?.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0) || 0;

    return {
        bills: data,
        summary: {
            pending_amount: pendingAmount,
            overdue_amount: overdueAmount,
            count: data?.length || 0,
        },
    };
}

// Get advances with filters
async function getAdvances(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    let query = supabase
        .from('advances')
        .select(`
      id, recipient_name, amount, purpose, advance_date, 
      expected_return_date, status, amount_returned, payment_method,
      approved_by, notes, created_at,
      funds!inner(id, name, church_id)
    `)
        .eq('funds.church_id', context.churchId)
        .order('advance_date', { ascending: false });

    if (args.status) {
        query = query.eq('status', args.status);
    }

    const limit = (args.limit as number) || 10;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    const outstandingAmount = data?.filter(a => a.status !== 'returned')
        .reduce((sum, a) => sum + (a.amount - (a.amount_returned || 0)), 0) || 0;

    return {
        advances: data,
        summary: {
            outstanding_amount: outstandingAmount,
            count: data?.length || 0,
        },
    };
}

// Get comprehensive financial summary
async function getFinancialSummary(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const period = (args.period as string) || 'month';
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (period) {
        case 'week':
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
        case 'month':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        case 'quarter':
            startDate = startOfQuarter(now);
            endDate = endOfQuarter(now);
            break;
        case 'year':
            startDate = startOfYear(now);
            endDate = endOfYear(now);
            break;
        default:
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Get all data in parallel
    const [fundBalances, transactions, offerings, bills] = await Promise.all([
        getFundBalances({}, context),
        getTransactions({ start_date: startDateStr, end_date: endDateStr, limit: 100 }, context),
        getOfferings({ start_date: startDateStr, end_date: endDateStr, limit: 100 }, context),
        getBills({ limit: 100 }, context),
    ]);

    const txSummary = (transactions as { summary: { total_income: number; total_expense: number; net: number } }).summary;
    const offeringSummary = (offerings as { summary: { total_amount: number } }).summary;
    const billsSummary = (bills as { summary: { pending_amount: number; overdue_amount: number } }).summary;
    const fundData = fundBalances as { total_balance: number };

    return {
        period: {
            name: period,
            start: startDateStr,
            end: endDateStr,
        },
        fund_balances: fundBalances,
        transactions: txSummary,
        offerings: offeringSummary,
        bills: billsSummary,
        highlights: {
            total_fund_balance: fundData.total_balance,
            period_income: txSummary.total_income,
            period_expenses: txSummary.total_expense,
            period_net: txSummary.net,
            period_offerings: offeringSummary.total_amount,
            upcoming_bills: billsSummary.pending_amount,
            overdue_bills: billsSummary.overdue_amount,
        },
    };
}

// Search records using vector similarity
async function searchRecords(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();
    const query = args.query as string;

    // For now, do a simple text search across multiple tables
    // Vector search will be implemented when embeddings are generated
    const tables = (args.tables as string[]) || ['transactions', 'bills', 'offerings'];
    const limit = (args.limit as number) || 10;

    const results: { table: string; records: unknown[] }[] = [];

    for (const table of tables) {
        let searchQuery;

        switch (table) {
            case 'transactions':
                searchQuery = supabase
                    .from('transactions')
                    .select(`*, funds!inner(id, name, church_id)`)
                    .eq('funds.church_id', context.churchId)
                    .or(`description.ilike.%${query}%,category.ilike.%${query}%`)
                    .limit(limit);
                break;

            case 'bills':
                searchQuery = supabase
                    .from('bills')
                    .select(`*, funds!inner(id, name, church_id)`)
                    .eq('funds.church_id', context.churchId)
                    .or(`vendor_name.ilike.%${query}%,category.ilike.%${query}%,notes.ilike.%${query}%`)
                    .limit(limit);
                break;

            case 'offerings':
                searchQuery = supabase
                    .from('offerings')
                    .select('*')
                    .or(`type.ilike.%${query}%,notes.ilike.%${query}%`)
                    .limit(limit);
                break;

            case 'members':
                searchQuery = supabase
                    .from('members')
                    .select('*')
                    .or(`name.ilike.%${query}%,fellowship_name.ilike.%${query}%,location.ilike.%${query}%`)
                    .limit(limit);
                break;

            default:
                continue;
        }

        const { data, error } = await searchQuery;

        if (!error && data && data.length > 0) {
            results.push({ table, records: data });
        }
    }

    return {
        query,
        results,
        total_count: results.reduce((sum, r) => sum + r.records.length, 0),
    };
}

// Create a new transaction
async function createTransaction(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    // First, get the fund ID by name
    const { data: fund, error: fundError } = await supabase
        .from('funds')
        .select('id')
        .eq('church_id', context.churchId)
        .ilike('name', `%${args.fund_name}%`)
        .single();

    if (fundError || !fund) {
        return {
            success: false,
            error: `Fund "${args.fund_name}" not found`,
        };
    }

    const transactionDate = (args.transaction_date as string) || format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
        .from('transactions')
        .insert({
            type: args.type,
            amount: args.amount,
            description: args.description,
            category: args.category,
            payment_method: args.payment_method,
            fund_id: fund.id,
            transaction_date: transactionDate,
            created_by: context.userId,
        })
        .select()
        .single();

    if (error) {
        return {
            success: false,
            error: error.message,
        };
    }

    return {
        success: true,
        message: `Transaction created successfully`,
        transaction: data,
    };
}

// Create a new offering
async function createOffering(
    args: Record<string, unknown>,
    context: FunctionContext
): Promise<unknown> {
    const supabase = getSupabaseAdmin();

    const serviceDate = (args.service_date as string) || format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
        .from('offerings')
        .insert({
            type: args.type,
            amount: args.amount,
            service_date: serviceDate,
            fund_allocations: args.fund_allocations,
            notes: args.notes || null,
        })
        .select()
        .single();

    if (error) {
        return {
            success: false,
            error: error.message,
        };
    }

    return {
        success: true,
        message: `Offering record created successfully`,
        offering: data,
    };
}
