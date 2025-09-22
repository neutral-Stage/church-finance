// Component-specific types for consistent props and state management
import type {
  Database,
  Fund,
  FundSummary,
  TransactionWithFund,
  BillWithFund,
  AdvanceWithFund,
  OfferingWithCount,
  ChurchWithRole,
  UserChurchContext,
  ApiResponse
} from '@/types/database';

// ===== PAGE DATA TYPES =====
// These types define the shape of data passed from server components to client components

export interface FundsPageData {
  funds: Fund[];
  fundSummaries?: FundSummary[];
  recentTransactions: TransactionWithFund[];
  totalFunds: number;
  totalBalance: number;
}

export interface TransactionsPageData {
  transactions: TransactionWithFund[];
  funds: Fund[];
  totalIncome: number;
  totalExpenses: number;
  pagination?: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface BillsPageData {
  bills: BillWithFund[];
  funds: Fund[];
  categories: string[];
  totalAmount: number;
  overdueCount: number;
}

export interface AdvancesPageData {
  advances: AdvanceWithFund[];
  funds: Fund[];
  totalAdvances: number;
  totalOutstanding: number;
}

export interface OfferingsPageData {
  offerings: OfferingWithCount[];
  funds: Fund[];
  totalOfferings: number;
  averageOffering: number;
}

export interface DashboardPageData {
  funds: FundSummary[];
  recentTransactions: TransactionWithFund[];
  upcomingBills: BillWithFund[];
  churchContext: UserChurchContext;
  summaryStats: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    pendingBills: number;
  };
}

// ===== FORM TYPES =====
// These types define the shape of form data

export interface FundFormData {
  name: string;
  description?: string;
  target_amount?: number;
  fund_type?: string;
  church_id?: string;
}

export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  fund_id: string;
  category: string;
  payment_method: string;
  transaction_date: string;
  receipt_number?: string;
}

export interface BillFormData {
  vendor_name: string;
  amount: number;
  description?: string;
  due_date: string;
  category?: string;
  status?: string;
  fund_id?: string;
  ledger_entry_id?: string;
  ledger_subgroup_id?: string;
  priority?: string;
  notes?: string;
}

export interface AdvanceFormData {
  recipient_name: string;
  amount: number;
  purpose: string;
  expected_return_date: string;
  fund_id: string;
  payment_method: string;
  notes?: string;
}

export interface OfferingFormData {
  amount: number;
  type: string;
  service_date: string;
  fund_allocations: Record<string, number>;
  notes?: string;
}

export interface FundTransferFormData {
  from_fund_id: string;
  to_fund_id: string;
  amount: number;
  description: string;
}

// ===== COMPONENT PROPS TYPES =====
// These types define the props for reusable components

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface FormDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data?: T;
  onSubmit: (data: T) => Promise<void>;
  loading?: boolean;
  children: React.ReactNode;
}

export interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  disabled?: boolean;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }>;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text' | 'number';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

// ===== STATE MANAGEMENT TYPES =====
// These types define the shape of component state

export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filters: Record<string, any>;
  selectedItems: string[];
  pagination?: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  loading: boolean;
  isValid: boolean;
}

export interface DialogState {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  data?: any;
}

// ===== API INTEGRATION TYPES =====
// These types define the shape of API responses for components

export interface ComponentApiResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface MutationResponse {
  success: boolean;
  error?: string;
  data?: any;
}

// ===== HOOK TYPES =====
// These types define the return types of custom hooks

export interface UseListHookReturn<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: any) => Promise<MutationResponse>;
  update: (id: string, data: any) => Promise<MutationResponse>;
  delete: (id: string) => Promise<MutationResponse>;
  search: (term: string) => void;
  filter: (filters: Record<string, any>) => void;
  select: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export interface UseFormHookReturn<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  loading: boolean;
  isValid: boolean;
  setValue: (key: keyof T, value: any) => void;
  setError: (key: keyof T, error: string) => void;
  clearErrors: () => void;
  reset: (newData?: T) => void;
  submit: () => Promise<MutationResponse>;
  validate: () => boolean;
}

// ===== UTILITY TYPES =====
// Helper types for component development

export type WithId<T> = T & { id: string };
export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at?: string;
};

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export type ValidationRule<T> = {
  field: keyof T;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
};

// ===== CONTEXT TYPES =====
// Types for React Context providers

export interface AppContextType {
  currentChurch: ChurchWithRole | null;
  userPermissions: Record<string, boolean>;
  loading: boolean;
  switchChurch: (churchId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ===== CONSTANTS =====
// Commonly used constants in components

export const FUND_TYPES = [
  'Mission Fund',
  'Building Fund',
  'Management Fund',
  'Special Fund',
  'Emergency Fund',
  'Tithe Fund',
  'Offering Fund'
] as const;

export const TRANSACTION_CATEGORIES = [
  'Utilities',
  'Office Supplies',
  'Maintenance',
  'Equipment',
  'Ministry',
  'Staff',
  'Outreach',
  'Other'
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Bank Transfer',
  'Credit Card',
  'Mobile Payment',
  'Other'
] as const;

export const BILL_STATUSES = [
  'pending',
  'approved',
  'paid',
  'overdue',
  'cancelled'
] as const;

export const ADVANCE_STATUSES = [
  'pending',
  'approved',
  'disbursed',
  'returned',
  'overdue'
] as const;

export const OFFERING_TYPES = [
  'Tithe',
  'Offering',
  'Special Offering',
  'Thanksgiving',
  'Mission',
  'Building Fund'
] as const;

export type FundType = typeof FUND_TYPES[number];
export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type BillStatus = typeof BILL_STATUSES[number];
export type AdvanceStatus = typeof ADVANCE_STATUSES[number];
export type OfferingType = typeof OFFERING_TYPES[number];