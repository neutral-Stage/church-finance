import { createServerClient } from "@/lib/supabase-server";
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
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      // Fallback to auth metadata
      const userMetadata = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email || "",
        role: userMetadata.role || "viewer",
        full_name: userMetadata.full_name || "",
        created_at: user.created_at,
      };
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name || "",
      phone: userData.phone || "",
      address: userData.address || "",
      bio: userData.bio || "",
      avatar_url: userData.avatar_url || "",
      created_at: userData.created_at,
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

  // Fetch all data in parallel for better performance
  const [
    fundsResult,
    transactionsResult,
    billsResult,
    advancesResult,
    monthlyIncomeResult,
    monthlyExpensesResult,
  ] = await Promise.all([
    // Fetch fund summaries
    supabase.from("fund_summary").select("*").order("name"),

    // Fetch recent transactions with fund details
    supabase
      .from("transactions")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10),

    // Fetch upcoming bills
    supabase
      .from("bills")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .in("status", ["pending", "overdue"])
      .order("due_date")
      .limit(5),

    // Fetch outstanding advances
    supabase
      .from("advances")
      .select(
        `
        *,
        fund:funds(*)
      `
      )
      .in("status", ["outstanding", "partial"])
      .order("expected_return_date")
      .limit(5),

    // Calculate monthly income
    (() => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const nextMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      )
        .toISOString()
        .slice(0, 10);

      return supabase
        .from("transactions")
        .select("amount")
        .eq("type", "income")
        .gte("transaction_date", `${currentMonth}-01`)
        .lt("transaction_date", nextMonth);
    })(),

    // Calculate monthly expenses
    (() => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const nextMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      )
        .toISOString()
        .slice(0, 10);

      return supabase
        .from("transactions")
        .select("amount")
        .eq("type", "expense")
        .gte("transaction_date", `${currentMonth}-01`)
        .lt("transaction_date", nextMonth);
    })(),
  ]);

  // Handle errors
  if (fundsResult.error)
    throw new Error(`Failed to fetch funds: ${fundsResult.error.message}`);
  if (transactionsResult.error)
    throw new Error(
      `Failed to fetch transactions: ${transactionsResult.error.message}`
    );
  if (billsResult.error)
    throw new Error(`Failed to fetch bills: ${billsResult.error.message}`);
  if (advancesResult.error)
    throw new Error(
      `Failed to fetch advances: ${advancesResult.error.message}`
    );
  if (monthlyIncomeResult.error)
    throw new Error(
      `Failed to fetch monthly income: ${monthlyIncomeResult.error.message}`
    );
  if (monthlyExpensesResult.error)
    throw new Error(
      `Failed to fetch monthly expenses: ${monthlyExpensesResult.error.message}`
    );

  // Calculate monthly totals
  const totalIncome =
    monthlyIncomeResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) ||
    0;
  const totalExpenses =
    monthlyExpensesResult.data?.reduce((sum, t) => sum + Number(t.amount), 0) ||
    0;

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
  offerings: any[]; // Define proper type based on your offerings schema
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
      .order("created_at", { ascending: false }),

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
      fundsData?.map((fund) => [fund.id, fund.name]) || []
    );

    // Process and group contributions by member
    const memberMap = new Map<string, MemberContribution>();

    offeringsData?.forEach((offering) => {
      const offeringMember = offering.offering_member;
      if (!offeringMember) return;

      const member = (offeringMember as unknown as { member: any }).member;
      if (!member) return;

      if (!memberMap.has(member.id)) {
        memberMap.set(member.id, {
          member,
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
        typeof offering.fund_allocations === "object"
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
        id: offering.id,
        service_date: offering.service_date,
        type: offering.type,
        amount: offering.amount,
        fund_name: fundName,
        notes: offering.notes,
      });

      memberContrib.total_amount += offering.amount;
      memberContrib.contribution_count += 1;

      if (
        !memberContrib.last_contribution_date ||
        offering.service_date > memberContrib.last_contribution_date
      ) {
        memberContrib.last_contribution_date = offering.service_date;
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
  offerings: any[];
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
