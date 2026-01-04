import { Database as SupabaseDatabase } from './supabase-generated';

export type Database = SupabaseDatabase;
export * from './supabase-generated';

// Helper aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// Make church_id optional in Insertable to match loose API usage
export type Insertable<T extends keyof Database['public']['Tables']> = Omit<Database['public']['Tables'][T]['Insert'], 'church_id'> & { church_id?: string };

export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Restored Custom Types
export type Church = Tables<'churches'>;
export type Fund = Tables<'funds'> & {
    cash_balance: number;
    bank_balance: number;
};
export type Transaction = Tables<'transactions'> & {
    payment_method: 'cash' | 'bank' | string;
};
export type Bill = Tables<'bills'>;
export type Advance = Tables<'advances'>;
export type Offering = Tables<'offerings'>;
export type Member = Tables<'members'>;
export type Notification = Tables<'notifications'>;
export type LedgerEntry = Tables<'ledger_entries'>;
export type LedgerSubgroup = Tables<'ledger_subgroups'>;
export type AuthUser = Tables<'users'>;
export type UserRole = Tables<'roles'>;

// Updated ChurchWithRole to be permissive for compatibility
export type ChurchWithRole = Church & {
    role?: UserRole | { name: string; permissions: any } | any;
    user_church_role?: any;
};

export type FundSummary = {
    id: string;
    name: string;
    fund_type: string;
    current_balance: number;
    cash_balance: number;
    bank_balance: number;
    total_income: number;
    total_expenses: number;
    total_offerings?: number;
};

export type TransactionWithFund = Transaction & {
    fund?: Fund;
};

export type BillWithFund = Bill & {
    fund?: Fund;
};

export type AdvanceWithFund = Advance & {
    fund?: Fund;
};

export type OfferingWithCount = Offering & {
    offering_members: { count: number }[];
};

export type OfferingWithFund = Offering & {
    offering_member: {
        member: Member
    }[];
};

export type LedgerSubgroupWithBills = LedgerSubgroup & {
    bills: Bill[];
};

export type LedgerEntryWithRelations = LedgerEntry & {
    ledger_subgroups: LedgerSubgroupWithBills[];
    bills: Bill[];
};

export type UserChurchContext = {
    churchId: string;
    role: string;
    permissions: any;
};

export type ApiResponse<T> = {
    data: T | null;
    error: string | null;
};

// CashBreakdownData matching client expectations
export type CashBreakdownData = {
    fund_type: string;
    denomination: number;
    count: number;
};

export type NotificationData = Notification;

export type ReportsData = {
    transactions: TransactionWithFund[];
    offerings: Tables<'offerings'>[];
    bills: BillWithFund[];
    advances: AdvanceWithFund[];
    funds: Fund[];
};
