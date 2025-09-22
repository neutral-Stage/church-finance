import { createServerClient } from "@/lib/supabase-server";
import { safeSelect } from "@/lib/supabase-helpers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type {
  FundSummary,
  TransactionWithFund,
  BillWithFund,
  AdvanceWithFund,
  LedgerEntry,
  LedgerSubgroup,
  Bill,
  Fund,
  AuthUser,
  Database,
} from "@/types/database";

// Re-export types for components
export type { Fund, TransactionWithFund };

// Cache user session for the duration of the request
export const getServerUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }

    // Try to get user data from users table
    const { data: userDataArray, error: userError } = await safeSelect(supabase, "users", {
      filter: { column: "id", value: user.id }
    });

    const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;

    if (userError || !userData) {
      // Fallback to auth metadata
      const userMetadata = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email || "",
        role: userMetadata.role || "viewer",
        full_name: userMetadata.full_name || "",
        created_at: user.created_at || "",
        address: null,
        avatar_url: null,
        bio: null,
        phone: null,
        updated_at: user.updated_at || user.created_at,
      };
    }

    return {
      id: userData.id,
      email: userData.email || "",
      role: userData.role || "viewer",
      full_name: userData.full_name || "",
      phone: userData.phone,
      address: userData.address,
      bio: userData.bio,
      avatar_url: userData.avatar_url,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    };
  } catch (error) {
    console.error("Server auth error:", error);
    return null;
  }
});

// Require authentication and redirect if not authenticated
export const requireAuth = async (): Promise<AuthUser> => {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
};

// Dashboard data fetching
export interface DashboardData {
  funds: FundSummary[];
  recentTransactions: TransactionWithFund[];
  upcomingBills: BillWithFund[];
  outstandingAdvances: AdvanceWithFund[];
  monthlyStats: {
    income: number;
    expenses: number;
    netIncome: number;
  };
}

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated
  const supabase = await createServerClient();

  // Fetch fund summaries from the view
  const fundsResult = await safeSelect(supabase, "funds", {
    order: { column: "name", ascending: true }
  });

  // Fetch recent transactions (without joins for now to avoid RLS issues)
  const transactionsResult = await safeSelect(supabase, "transactions", {
    order: { column: "created_at", ascending: false },
    limit: 10
  });

  // Fetch all funds to join manually
  const allFundsResult = await safeSelect(supabase, "funds");

  // Fetch upcoming bills
  const allBillsResult = await safeSelect(supabase, "bills", {
    order: { column: "due_date", ascending: true },
    limit: 50 // Get more and filter in memory
  });

  // Fetch outstanding advances
  const allAdvancesResult = await safeSelect(supabase, "advances", {
    order: { column: "expected_return_date", ascending: true },
    limit: 50 // Get more and filter in memory
  });

  // Calculate monthly income and expenses
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const nextMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1
  ).toISOString().slice(0, 10);

  const allTransactionsResult = await safeSelect(supabase, "transactions");

  // Filter for monthly data in memory
  const monthlyIncomeResult = {
    data: allTransactionsResult.data?.filter(t =>
      t.type === "income" &&
      t.transaction_date >= `${currentMonth}-01` &&
      t.transaction_date < nextMonth
    ) || [],
    error: allTransactionsResult.error
  };

  const monthlyExpensesResult = {
    data: allTransactionsResult.data?.filter(t =>
      t.type === "expense" &&
      t.transaction_date >= `${currentMonth}-01` &&
      t.transaction_date < nextMonth
    ) || [],
    error: allTransactionsResult.error
  };

  // Handle errors
  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);
  if (transactionsResult.error)
    throw new Error(
      `Failed to fetch transactions: ${transactionsResult.error.message}`
    );
  if (allBillsResult.error)
    throw new Error(`Failed to fetch bills: ${allBillsResult.error.message}`);
  if (allAdvancesResult.error)
    throw new Error(
      `Failed to fetch advances: ${allAdvancesResult.error.message}`
    );
  if (monthlyIncomeResult.error)
    throw new Error(
      `Failed to fetch monthly income: ${monthlyIncomeResult.error.message}`
    );
  if (monthlyExpensesResult.error)
    throw new Error(
      `Failed to fetch monthly expenses: ${monthlyExpensesResult.error.message}`
    );

  // Create fund lookup map
  const fundsMap = new Map((allFundsResult.data || []).map(fund => [fund.id, fund]));

  // Manually join transactions with funds
  const recentTransactions: TransactionWithFund[] = (transactionsResult.data || []).map(transaction => ({
    ...transaction,
    fund: transaction.fund_id ? fundsMap.get(transaction.fund_id) : undefined
  }));

  // Filter and join bills
  const upcomingBills: BillWithFund[] = (allBillsResult.data || [])
    .filter(bill => ["pending", "overdue"].includes(bill.status || ""))
    .slice(0, 5)
    .map(bill => ({
      ...bill,
      funds: bill.fund_id ? fundsMap.get(bill.fund_id) : undefined
    }));

  // Filter and join advances
  const outstandingAdvances: AdvanceWithFund[] = (allAdvancesResult.data || [])
    .filter(advance => ["outstanding", "partial"].includes(advance.status || ""))
    .slice(0, 5)
    .map(advance => ({
      ...advance,
      funds: advance.fund_id ? fundsMap.get(advance.fund_id) : undefined
    }));

  // Calculate monthly totals
  const totalIncome =
    monthlyIncomeResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) ||
    0;
  const totalExpenses =
    monthlyExpensesResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) ||
    0;

  // Transform fund data to match FundSummary type
  const transformedFunds: FundSummary[] = (fundsResult.data || []).map((fund: any) => ({
    id: fund.id || "",
    name: fund.name || "",
    church_id: fund.church_id,
    created_at: fund.created_at,
    created_by: fund.created_by,
    current_balance: fund.current_balance || 0,
    description: fund.description,
    fund_type: fund.fund_type,
    is_active: fund.is_active ?? true,
    target_amount: fund.target_amount,
    updated_at: fund.updated_at,
    transaction_count: 0,
    total_income: fund.total_income,
    total_expenses: fund.total_expenses,
    total_offerings: fund.total_offerings,
  }));

  return {
    funds: transformedFunds,
    recentTransactions,
    upcomingBills,
    outstandingAdvances,
    monthlyStats: {
      income: totalIncome,
      expenses: totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  };
});

// Transactions data fetching
export interface TransactionsData {
  transactions: TransactionWithFund[];
  funds: Fund[];
}

export const getTransactionsData = cache(
  async (): Promise<TransactionsData> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    await requireAuth();

    // Now we can safely assume user is authenticated
    const supabase = await createServerClient();

    const [transactionsResult, fundsResult] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          `
        *,
        fund:funds(*)
      `
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase.from("funds").select("*").order("name"),
    ]);

    if (transactionsResult.error)
      throw new Error(
        `Failed to fetch transactions: ${transactionsResult.error.message}`
      );
    if (fundsResult.error)
      throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);

    return {
      transactions: transactionsResult.data || [],
      funds: fundsResult.data || [],
    };
  }
);

// Ledger entries data fetching
export interface LedgerSubgroupWithBills extends LedgerSubgroup {
  bills?: Bill[];
}

export interface LedgerEntryWithRelations extends LedgerEntry {
  ledger_subgroups?: LedgerSubgroupWithBills[];
  bills?: Bill[];
}

export const getLedgerEntriesData = cache(
  async (): Promise<LedgerEntryWithRelations[]> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    await requireAuth();

    // Now we can safely assume user is authenticated
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("ledger_entries")
      .select(
        `
      *,
      ledger_subgroups(*),
      bills(*)
    `
      )
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Failed to fetch ledger entries: ${error.message}`);

    return data || [];
  }
);

// Members data fetching
export interface Member {
  id: string;
  name: string;
  phone?: string;
  fellowship_name?: string;
  job?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export const getMembersData = cache(async (): Promise<Member[]> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name");

  if (error) throw new Error(`Failed to fetch members: ${error.message}`);
  return data || [];
});

// Bills data fetching
export interface BillsData {
  bills: BillWithFund[];
  funds: Fund[];
}

export const getBillsData = cache(async (): Promise<BillsData> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated

  const supabase = await createServerClient();

  const [billsResult, fundsResult] = await Promise.all([
    supabase
      .from("bills")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .order("due_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase.from("funds").select("*").order("name"),
  ]);

  if (billsResult.error)
    throw new Error(`Failed to fetch bills: ${billsResult.error.message}`);
  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);

  return {
    bills: billsResult.data || [],
    funds: fundsResult.data || [],
  };
});

// Advances data fetching
export interface AdvancesData {
  advances: AdvanceWithFund[];
  funds: Fund[];
}

export const getAdvancesData = cache(async (): Promise<AdvancesData> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated

  const supabase = await createServerClient();

  const [advancesResult, fundsResult] = await Promise.all([
    supabase
      .from("advances")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .order("created_at", { ascending: false }),

    supabase.from("funds").select("*").order("name"),
  ]);

  if (advancesResult.error)
    throw new Error(
      `Failed to fetch advances: ${advancesResult.error.message}`
    );
  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);

  return {
    advances: advancesResult.data || [],
    funds: fundsResult.data || [],
  };
});

// Offerings data fetching
export interface OfferingsData {
  offerings: Database['public']['Tables']['offerings']['Row'][];
  funds: Fund[];
}

export const getOfferingsData = cache(async (): Promise<OfferingsData> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated

  const supabase = await createServerClient();

  const [offeringsResult, fundsResult] = await Promise.all([
    supabase
      .from("offerings")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .order("service_date", { ascending: false }),

    supabase.from("funds").select("*").order("name"),
  ]);

  if (offeringsResult.error)
    throw new Error(
      `Failed to fetch offerings: ${offeringsResult.error.message}`
    );
  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);

  return {
    offerings: offeringsResult.data || [],
    funds: fundsResult.data || [],
  };
});

// Cash breakdown data fetching
export interface CashBreakdownData {
  id: string;
  fund_type: string;
  denomination: number;
  count: number;
  total_amount: number;
}

export const getCashBreakdownData = cache(
  async (): Promise<CashBreakdownData[]> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    await requireAuth();

    // Now we can safely assume user is authenticated

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("cash_breakdown")
      .select("*")
      .order("fund_type")
      .order("denomination", { ascending: false });

    if (error)
      throw new Error(`Failed to fetch cash breakdown: ${error.message}`);
    return data || [];
  }
);

// Funds with transactions data fetching
export interface FundsPageData {
  funds: Fund[];
  recentTransactions: TransactionWithFund[];
}

export const getFundsPageData = cache(async (): Promise<FundsPageData> => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  await requireAuth();

  // Now we can safely assume user is authenticated

  const supabase = await createServerClient();

  const [fundsResult, transactionsResult] = await Promise.all([
    supabase.from("funds").select("*").order("name"),

    supabase
      .from("transactions")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);
  if (transactionsResult.error)
    throw new Error(
      `Failed to fetch transactions: ${transactionsResult.error.message}`
    );

  return {
    funds: fundsResult.data || [],
    recentTransactions: transactionsResult.data || [],
  };
});

// Member contributions data fetching
export interface MemberContribution {
  member: {
    id: string;
    name: string;
    phone?: string;
    fellowship_name?: string;
    job?: string;
    location?: string;
  };
  contributions: {
    id: string;
    service_date: string;
    type: string;
    amount: number;
    fund_name: string;
    notes?: string;
  }[];
  total_amount: number;
  contribution_count: number;
  last_contribution_date: string;
  missing_months: number;
  missing_months_list: string[];
  average_monthly_amount: number;
  average_annual_amount: number;
  months_with_contributions: number;
}

export const getMemberContributionsData = cache(
  async (): Promise<MemberContribution[]> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    await requireAuth();

    // Now we can safely assume user is authenticated

    const supabase = await createServerClient();

    // Fetch all offerings with their member and fund information
    const { data: offeringsData, error: offeringsError } = await supabase
      .from("offerings")
      .select(
        `
      id,
      service_date,
      type,
      amount,
      notes,
      fund_allocations,
      offering_member!inner(
        id,
        member_id,
        member:members(
          id,
          name,
          phone,
          fellowship_name,
          job,
          location
        )
      )
    `
      )
      .order("service_date", { ascending: false });

    if (offeringsError)
      throw new Error(
        `Failed to fetch member contributions: ${offeringsError.message}`
      );

    // Fetch funds for fund name lookup
    const { data: fundsData, error: fundsError } = await supabase
      .from("funds")
      .select("id, name");

    if (fundsError)
      throw new Error(`Failed to fetch funds: ${fundsError.message}`);

    const fundsMap = new Map(
      (fundsData || []).map((fund: any) => [fund.id, fund.name])
    );

    // Process and group contributions by member
    const memberMap = new Map<string, MemberContribution>();

    (offeringsData || []).forEach((offering: any) => {
      const offeringMember = offering.offering_member;
      if (!offeringMember) return;

      const member = (offeringMember as any)?.member;
      if (!member) return;

      if (!memberMap.has(member.id)) {
        memberMap.set(member.id, {
          member: {
            id: member.id,
            name: member.name,
            phone: member.phone || undefined,
            fellowship_name: member.fellowship_name || undefined,
            job: member.job || undefined,
            location: member.location || undefined,
          },
          contributions: [],
          total_amount: 0,
          contribution_count: 0,
          last_contribution_date: "",
          missing_months: 0,
          missing_months_list: [],
          average_monthly_amount: 0,
          average_annual_amount: 0,
          months_with_contributions: 0,
        });
      }

      const memberContrib = memberMap.get(member.id)!;

      // Determine fund name from fund_allocations
      let fundName = "Unknown";
      if (
        offering.fund_allocations &&
        typeof offering.fund_allocations === "object" &&
        offering.fund_allocations !== null
      ) {
        const fundAllocations = offering.fund_allocations as Record<
          string,
          number
        >;
        const fundIds = Object.keys(fundAllocations);
        if (fundIds.length > 0) {
          fundName = fundsMap.get(fundIds[0]) || "Unknown";
        }
      }

      memberContrib.contributions.push({
        id: offering.id || "",
        service_date: offering.service_date || "",
        type: offering.type || "",
        amount: offering.amount || 0,
        fund_name: fundName,
        notes: offering.notes || undefined,
      });

      memberContrib.total_amount += (offering.amount || 0);
      memberContrib.contribution_count += 1;

      if (
        !memberContrib.last_contribution_date ||
        (offering.service_date && offering.service_date > memberContrib.last_contribution_date)
      ) {
        memberContrib.last_contribution_date = offering.service_date || "";
      }
    });

    // Calculate analytics for each member
    memberMap.forEach((memberContrib) => {
      memberContrib.contributions.sort(
        (a, b) =>
          new Date(b.service_date).getTime() -
          new Date(a.service_date).getTime()
      );

      // Calculate missing months and averages (simplified calculation)
      const now = new Date();
      const twelveMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 11,
        1
      );

      const allMonths: string[] = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        allMonths.push(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`
        );
      }

      const contributionMonths = new Set(
        memberContrib.contributions
          .filter((c) => new Date(c.service_date) >= twelveMonthsAgo)
          .map((c) => {
            const date = new Date(c.service_date);
            return `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
          })
      );

      const missingMonths = allMonths.filter(
        (month) => !contributionMonths.has(month)
      );
      const monthsWithContributions = contributionMonths.size;

      const recentContributions = memberContrib.contributions.filter(
        (c) => new Date(c.service_date) >= twelveMonthsAgo
      );
      const totalRecentAmount = recentContributions.reduce(
        (sum, c) => sum + c.amount,
        0
      );

      memberContrib.missing_months = missingMonths.length;
      memberContrib.missing_months_list = missingMonths.sort().reverse();
      memberContrib.average_monthly_amount =
        monthsWithContributions > 0
          ? totalRecentAmount / monthsWithContributions
          : 0;
      memberContrib.average_annual_amount = totalRecentAmount;
      memberContrib.months_with_contributions = monthsWithContributions;
    });

    return Array.from(memberMap.values());
  }
);

// Notifications data fetching
export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category:
    | "transaction"
    | "member"
    | "offering"
    | "bill"
    | "system"
    | "report"
    | "advance";
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export const getNotificationsData = cache(
  async (): Promise<NotificationData[]> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    const user = await requireAuth();

    // Now we can safely assume user is authenticated

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error)
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    return data || [];
  }
);

// Reports data fetching
export interface ReportsData {
  transactions: TransactionWithFund[];
  offerings: Database['public']['Tables']['offerings']['Row'][];
  bills: BillWithFund[];
  advances: AdvanceWithFund[];
  funds: Fund[];
}

export const getReportsData = cache(
  async (dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<ReportsData> => {
    // Use requireAuth to ensure user is authenticated - will redirect if not
    await requireAuth();

    // Now we can safely assume user is authenticated

    const supabase = await createServerClient();

    const [
      transactionsResult,
      offeringsResult,
      billsResult,
      advancesResult,
      fundsResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          `
        *,
        fund:funds(*)
      `
        )
        .gte("transaction_date", dateRange.startDate)
        .lte("transaction_date", dateRange.endDate)
        .order("transaction_date", { ascending: false }),

      supabase
        .from("offerings")
        .select("*")
        .gte("service_date", dateRange.startDate)
        .lte("service_date", dateRange.endDate)
        .order("service_date", { ascending: false }),

      supabase
        .from("bills")
        .select(
          `
        *,
        fund:funds(*)
      `
        )
        .gte("due_date", dateRange.startDate)
        .lte("due_date", dateRange.endDate)
        .order("due_date", { ascending: false }),

      supabase
        .from("advances")
        .select(
          `
        *,
        fund:funds(*)
      `
        )
        .gte("created_at", dateRange.startDate)
        .lte("created_at", dateRange.endDate)
        .order("created_at", { ascending: false }),

      supabase.from("funds").select("*").order("name"),
    ]);

    if (transactionsResult.error)
      throw new Error(
        `Failed to fetch transactions: ${transactionsResult.error.message}`
      );
    if (offeringsResult.error)
      throw new Error(
        `Failed to fetch offerings: ${offeringsResult.error.message}`
      );
    if (billsResult.error)
      throw new Error(`Failed to fetch bills: ${billsResult.error.message}`);
    if (advancesResult.error)
      throw new Error(
        `Failed to fetch advances: ${advancesResult.error.message}`
      );
    if (fundsResult.error)
      throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);

    return {
      transactions: transactionsResult.data || [],
      offerings: offeringsResult.data || [],
      bills: billsResult.data || [],
      advances: advancesResult.data || [],
      funds: fundsResult.data || [],
    };
  }
);

// User permissions helpers (server-side)
export const checkUserPermissions = async () => {
  // Use requireAuth to ensure user is authenticated - will redirect if not
  const user = await requireAuth();

  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    treasurer: 2,
    admin: 3,
  };

  const hasRole = (role: string): boolean => {
    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[role] || 0);
  };

  return {
    canEdit: hasRole("treasurer"),
    canDelete: hasRole("admin"),
    canApprove: hasRole("treasurer"),
    userRole: user.role,
  };
};
