// APPLICATION-LEVEL FIX: Remove Conflicting Church Filtering
// The root cause is double-filtering: RLS + application-level .eq("church_id")
// Solution: Remove all explicit church_id filters and rely solely on RLS

// =====================================================================================
// UPDATED SERVER DATA FUNCTIONS (WITHOUT EXPLICIT CHURCH FILTERING)
// =====================================================================================

// This file shows the corrected approach for server-data.ts functions
// The key principle: NEVER use .eq("church_id", selectedChurch.id) when RLS is active

// ❌ WRONG APPROACH (causes conflicts):
// const fundsResult = await supabase
//   .from("funds")
//   .select("*")
//   .eq("church_id", selectedChurch.id)  // ← THIS CONFLICTS WITH RLS
//   .order("name");

// ✅ CORRECT APPROACH (RLS handles filtering):
// const fundsResult = await supabase
//   .from("funds")
//   .select("*")
//   .order("name");  // ← RLS automatically filters by user's church access

// =====================================================================================
// EXAMPLE CORRECTED FUNCTIONS
// =====================================================================================

export const getFundsPageDataCorrected = async (): Promise<FundsPageData> => {
  // Authenticate user
  await requireAuth();

  // Create supabase client (with user context for RLS)
  const supabase = await createServerClient();

  // ✅ CORRECT: Let RLS handle church filtering
  const [fundsResult, transactionsResult] = await Promise.all([
    supabase
      .from("funds")
      .select("*")
      .order("name"),  // No .eq("church_id") - RLS handles this

    supabase
      .from("transactions")
      .select(`
        *,
        fund:funds(*)
      `)
      .order("created_at", { ascending: false })
      .limit(20),  // No .eq("church_id") - RLS handles this through fund relationship
  ]);

  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);
  if (transactionsResult.error)
    throw new Error(`Failed to fetch transactions: ${transactionsResult.error.message}`);

  return {
    funds: fundsResult.data || [],
    recentTransactions: transactionsResult.data || [],
  };
};

export const getDashboardDataCorrected = async (): Promise<DashboardData> => {
  // Authenticate user
  await requireAuth();

  // Create supabase client (with user context for RLS)
  const supabase = await createServerClient();

  // ✅ CORRECT: No explicit church_id filtering - RLS handles everything
  const [
    fundsResult,
    transactionsResult,
    billsResult,
    advancesResult
  ] = await Promise.all([
    // Funds - RLS automatically filters by user's church access
    supabase
      .from("funds")
      .select("*")
      .order("name"),

    // Transactions - RLS filters through fund relationship
    supabase
      .from("transactions")
      .select(`
        *,
        fund:funds(*)
      `)
      .order("created_at", { ascending: false })
      .limit(10),

    // Bills - RLS filters through fund relationship
    supabase
      .from("bills")
      .select(`
        *,
        fund:funds(*)
      `)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true })
      .limit(5),

    // Advances - RLS filters through fund relationship
    supabase
      .from("advances")
      .select(`
        *,
        fund:funds(*)
      `)
      .in("status", ["outstanding", "partial"])
      .order("expected_return_date", { ascending: true })
      .limit(5)
  ]);

  // Handle errors
  if (fundsResult.error) throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);
  if (transactionsResult.error) throw new Error(`Failed to fetch transactions: ${transactionsResult.error.message}`);
  if (billsResult.error) throw new Error(`Failed to fetch bills: ${billsResult.error.message}`);
  if (advancesResult.error) throw new Error(`Failed to fetch advances: ${advancesResult.error.message}`);

  // Calculate monthly stats from transactions (RLS already filtered them)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10);

  const monthlyTransactions = (transactionsResult.data || []).filter(t =>
    t.transaction_date >= `${currentMonth}-01` && t.transaction_date < nextMonth
  );

  const totalIncome = monthlyTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    funds: fundsResult.data || [],
    recentTransactions: transactionsResult.data || [],
    upcomingBills: billsResult.data || [],
    outstandingAdvances: advancesResult.data || [],
    monthlyStats: {
      income: totalIncome,
      expenses: totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  };
};

// =====================================================================================
// KEY PRINCIPLES FOR FIXING THE APPLICATION
// =====================================================================================

/*
1. REMOVE ALL .eq("church_id", selectedChurch.id) calls from queries
2. REMOVE church_id from filter parameters in safeSelect calls
3. LET RLS POLICIES handle all church-based filtering
4. ENSURE the Supabase client uses user authentication context (not service role)
5. TRUST that RLS policies will return only data the user can access

WHY THIS WORKS:
- RLS policies run at the database level with full user context
- They have access to auth.uid() and user roles
- They automatically filter ALL queries without application intervention
- This eliminates the double-filtering conflict that was causing data to show incorrectly

WHAT TO UPDATE IN server-data.ts:
1. Remove all .eq("church_id", selectedChurch.id) calls
2. Remove all church_id filter parameters from safeSelect calls
3. Remove selectedChurch requirement checks (RLS handles access control)
4. Keep user authentication checks (requireAuth())
5. Trust RLS to return correct data based on user's church access
*/

export default {
  getFundsPageDataCorrected,
  getDashboardDataCorrected
};