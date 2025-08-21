/* eslint-disable @typescript-eslint/ban-types */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      funds: {
        Row: {
          id: string
          name: 'Management' | 'Mission' | 'Building'
          current_balance: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: 'Management' | 'Mission' | 'Building'
          current_balance?: number
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: 'Management' | 'Mission' | 'Building'
          current_balance?: number
          description?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          payment_method: 'cash' | 'bank'
          fund_id: string
          transaction_date: string
          receipt_number: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'income' | 'expense'
          amount: number
          description: string
          category: string
          payment_method: 'cash' | 'bank'
          fund_id: string
          transaction_date: string
          receipt_number?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'income' | 'expense'
          amount?: number
          description?: string
          category?: string
          payment_method?: 'cash' | 'bank'
          fund_id?: string
          transaction_date?: string
          receipt_number?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      offerings: {
        Row: {
          id: string
          type: 'Tithe' | 'Lord\'s Day' | 'Other Offering' | 'Special Offering' | 'Mission Fund Offering' | 'Building Fund Offering'
          amount: number
          service_date: string
          contributors_count: number | null
          fund_allocations: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'Tithe' | 'Lord\'s Day' | 'Other Offering' | 'Special Offering' | 'Mission Fund Offering' | 'Building Fund Offering'
          amount: number
          service_date: string
          contributors_count?: number | null
          fund_allocations: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'Tithe' | 'Lord\'s Day' | 'Other Offering' | 'Special Offering' | 'Mission Fund Offering' | 'Building Fund Offering'
          amount?: number
          service_date?: string
          contributors_count?: number | null
          fund_allocations?: Json
          notes?: string | null
          created_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          vendor_name: string
          amount: number
          due_date: string
          frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
          status: 'pending' | 'paid' | 'overdue'
          category: string
          fund_id: string
          created_at: string
        }
        Insert: {
          id?: string
          vendor_name: string
          amount: number
          due_date: string
          frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
          status?: 'pending' | 'paid' | 'overdue'
          category: string
          fund_id: string
          created_at?: string
        }
        Update: {
          id?: string
          vendor_name?: string
          amount?: number
          due_date?: string
          frequency?: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
          status?: 'pending' | 'paid' | 'overdue'
          category?: string
          fund_id?: string
          created_at?: string
        }
      }
      advances: {
        Row: {
          id: string
          recipient_name: string
          amount: number
          purpose: string
          advance_date: string
          expected_return_date: string
          status: 'outstanding' | 'partial' | 'returned'
          amount_returned: number
          payment_method: 'cash' | 'bank'
          fund_id: string
          approved_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_name: string
          amount: number
          purpose: string
          advance_date: string
          expected_return_date: string
          status?: 'outstanding' | 'partial' | 'returned'
          amount_returned?: number
          payment_method: 'cash' | 'bank'
          fund_id: string
          approved_by: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_name?: string
          amount?: number
          purpose?: string
          advance_date?: string
          expected_return_date?: string
          status?: 'outstanding' | 'partial' | 'returned'
          amount_returned?: number
          payment_method?: 'cash' | 'bank'
          fund_id?: string
          approved_by?: string
          notes?: string | null
          created_at?: string
        }
      }
      petty_cash: {
        Row: {
          id: string
          amount: number
          purpose: string
          transaction_date: string
          approved_by: string
          receipt_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          amount: number
          purpose: string
          transaction_date: string
          approved_by: string
          receipt_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          amount?: number
          purpose?: string
          transaction_date?: string
          approved_by?: string
          receipt_available?: boolean
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          name: string
          phone: string | null
          fellowship_name: string | null
          job: string | null
          location: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          fellowship_name?: string | null
          job?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          fellowship_name?: string | null
          job?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      offering_member: {
        Row: {
          id: string
          offering_id: string
          member_id: string
          created_at: string
        }
        Insert: {
          id?: string
          offering_id: string
          member_id: string
          created_at?: string
        }
        Update: {
          id?: string
          offering_id?: string
          member_id?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          address: string | null
          bio: string | null
          role: 'admin' | 'treasurer' | 'viewer'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          bio?: string | null
          role?: 'admin' | 'treasurer' | 'viewer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          address?: string | null
          bio?: string | null
          role?: 'admin' | 'treasurer' | 'viewer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fund_summary: {
        Row: {
          id: string
          name: string
          current_balance: number
          total_income: number
          total_expenses: number
          total_offerings: number
          created_at: string
        }
      }
    }
    Views: {
      fund_summary: {
        Row: {
          id: string
          name: string
          current_balance: number
          total_income: number
          total_expenses: number
          total_offerings: number
          created_at: string
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Application-specific types
export type Fund = Database['public']['Tables']['funds']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Offering = Database['public']['Tables']['offerings']['Row']
export type Bill = Database['public']['Tables']['bills']['Row']
export type Advance = Database['public']['Tables']['advances']['Row']
export type PettyCash = Database['public']['Tables']['petty_cash']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type OfferingMember = Database['public']['Tables']['offering_member']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type FundSummary = Database['public']['Views']['fund_summary']['Row']

// Insert types
export type FundInsert = Database['public']['Tables']['funds']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type OfferingInsert = Database['public']['Tables']['offerings']['Insert']
export type BillInsert = Database['public']['Tables']['bills']['Insert']
export type AdvanceInsert = Database['public']['Tables']['advances']['Insert']
export type PettyCashInsert = Database['public']['Tables']['petty_cash']['Insert']
export type MemberInsert = Database['public']['Tables']['members']['Insert']
export type OfferingMemberInsert = Database['public']['Tables']['offering_member']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']

// Update types
export type FundUpdate = Database['public']['Tables']['funds']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type OfferingUpdate = Database['public']['Tables']['offerings']['Update']
export type BillUpdate = Database['public']['Tables']['bills']['Update']
export type AdvanceUpdate = Database['public']['Tables']['advances']['Update']
export type PettyCashUpdate = Database['public']['Tables']['petty_cash']['Update']
export type MemberUpdate = Database['public']['Tables']['members']['Update']
export type OfferingMemberUpdate = Database['public']['Tables']['offering_member']['Update']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Extended types with relationships
export interface TransactionWithFund extends Transaction {
  fund: Fund
}

export interface BillWithFund extends Bill {
  fund: Fund
}

export interface AdvanceWithFund extends Advance {
  fund: Fund
}

// Fund allocation type for offerings
export interface FundAllocation {
  Management?: number
  Mission?: number
  Building?: number
}

// User roles
export type UserRole = 'admin' | 'treasurer' | 'viewer'

// Auth user with metadata
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name?: string
  phone?: string
  address?: string
  bio?: string
  avatar_url?: string
  created_at: string
}

// Dashboard summary types
export interface DashboardSummary {
  totalBalance: number
  funds: FundSummary[]
  recentTransactions: TransactionWithFund[]
  upcomingBills: BillWithFund[]
  outstandingAdvances: AdvanceWithFund[]
  monthlyIncome: number
  monthlyExpenses: number
}

// Report types
export interface FinancialReport {
  period: {
    start: string
    end: string
  }
  summary: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
    fundBalances: Record<string, number>
  }
  transactions: TransactionWithFund[]
  offerings: Offering[]
  bills: BillWithFund[]
  advances: AdvanceWithFund[]
  pettyCash: PettyCash[]
}

// Form types
export interface TransactionForm {
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  payment_method: 'cash' | 'bank'
  fund_id: string
  transaction_date: string
  receipt_number?: string
}

export interface OfferingForm {
  type: 'tithe' | 'lords_day' | 'special' | 'mission'
  amount: number
  service_date: string
  contributors_count?: number
  fund_allocations: FundAllocation
  notes?: string
}

export interface BillForm {
  vendor_name: string
  amount: number
  due_date: string
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly'
  category: string
  fund_id: string
}

export interface AdvanceForm {
  recipient_name: string
  amount: number
  purpose: string
  advance_date: string
  expected_return_date: string
  payment_method: 'cash' | 'bank'
  fund_id: string
  approved_by: string
  notes?: string
}

export interface PettyCashForm {
  amount: number
  purpose: string
  transaction_date: string
  approved_by: string
  receipt_available: boolean
}