import { Database } from './database'

// Base admin entity interfaces
export type AdminUser = Database['public']['Tables']['users']['Row']
export type AdminRole = Database['public']['Tables']['roles']['Row']
export type AdminChurch = Database['public']['Tables']['churches']['Row']
export type AdminUserChurchRole = Database['public']['Tables']['user_church_roles']['Row']

// Enhanced admin interfaces with relationships
export interface UserWithRoles extends AdminUser {
  church_roles: Array<{
    id: string
    church: AdminChurch
    role: AdminRole
    user_church_role: AdminUserChurchRole
    granted_by?: {
      full_name: string | null
      email: string
    }
  }>
}

export interface UserRoleWithDetails {
  id: string
  user_id: string
  church_id: string
  role_id: string
  is_active: boolean
  granted_at: string
  expires_at?: string
  notes?: string
  granted_by?: string
  users: {
    id: string
    email: string
    full_name?: string
  }
  churches: {
    id: string
    name: string
    type: string
  }
  roles: {
    id: string
    name: string
    display_name: string
  }
  granted_by_user?: {
    full_name?: string
    email: string
  }
}

export interface ChurchFinancialData {
  id: string
  name: string
  type: string
  is_active: boolean
  created_at: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  established_date: string | null
  funds: {
    total_funds: number
    active_funds: number
    total_balance: number
    total_income: number
    total_expenses: number
    fund_types: Record<string, number>
  }
  recent_activity: {
    transactions_last_30_days: number
    offerings_last_30_days: number
    bills_pending: number
    advances_outstanding: number
  }
  member_count?: number
  user_count?: number
}

export interface SystemSummary {
  total_churches: number
  active_churches: number
  total_system_balance: number
  total_system_income: number
  total_system_expenses: number
  total_funds: number
  avg_balance_per_church: number
}

// Common form interfaces
export interface ChurchFormData {
  name: string
  type: string
  description: string
  address: string
  phone: string
  email: string
  website: string
  established_date: string
  is_active: boolean
}

export interface RoleFormData {
  name: string
  display_name: string
  description: string
  permissions: Record<string, Record<string, boolean>>
}

export interface UserRoleFormData {
  user_id: string
  church_id: string
  role_id: string
  expires_at: string
  notes: string
}

// Filter and search interfaces
export interface AdminFilters {
  search: string
  type?: string
  status?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface ChurchFilters extends AdminFilters {
  type: 'all' | 'church' | 'fellowship' | 'ministry'
  status: 'all' | 'true' | 'false'
  sortBy: 'name' | 'balance' | 'income' | 'funds' | 'activity' | 'created'
}

export interface RoleFilters extends AdminFilters {
  sortBy: 'name' | 'display_name' | 'created_at'
}

export interface UserFilters extends AdminFilters {
  sortBy: 'name' | 'email' | 'created_at' | 'role'
}

// API response interfaces
export interface AdminApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface ChurchesApiResponse extends AdminApiResponse {
  churches: ChurchFinancialData[]
  summary: SystemSummary
}

export interface RolesApiResponse extends AdminApiResponse {
  roles: AdminRole[]
}

export interface UsersApiResponse extends AdminApiResponse {
  users: UserWithRoles[]
}

export interface UserRolesApiResponse extends AdminApiResponse {
  userChurchRoles: UserRoleWithDetails[]
}

// Permission-related interfaces
export interface ChurchPermissions {
  [resource: string]: Record<string, boolean>
}

export interface PermissionResource {
  key: string
  label: string
  description: string
}

export interface PermissionAction {
  key: string
  label: string
  description: string
}

// Admin page state interfaces
export interface AdminPageState<T, F extends AdminFilters> {
  data: T[]
  loading: boolean
  error: string
  filters: F
  selectedItem: T | null
  isCreateDialogOpen: boolean
  isEditDialogOpen: boolean
  isDetailDialogOpen: boolean
  submitting: boolean
}

// Common admin table column interface
export interface AdminTableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

// Status and color utility types
export type StatusColor = 'default' | 'success' | 'warning' | 'error' | 'info'
export type ChurchType = 'church' | 'fellowship' | 'ministry'
export type UserRoleType = 'super_admin' | 'church_admin' | 'treasurer' | 'finance_viewer'

// Export constants
export const CHURCH_TYPES: ChurchType[] = ['church', 'fellowship', 'ministry']
export const USER_ROLE_TYPES: UserRoleType[] = ['super_admin', 'church_admin', 'treasurer', 'finance_viewer']

export const PERMISSION_RESOURCES: PermissionResource[] = [
  { key: 'churches', label: 'Churches', description: 'Manage church/fellowship/ministry organizations' },
  { key: 'users', label: 'Users', description: 'Manage user accounts and access' },
  { key: 'roles', label: 'Roles', description: 'Manage roles and permissions' },
  { key: 'funds', label: 'Funds', description: 'Manage fund accounts' },
  { key: 'transactions', label: 'Transactions', description: 'Manage financial transactions' },
  { key: 'offerings', label: 'Offerings', description: 'Manage offering records' },
  { key: 'bills', label: 'Bills', description: 'Manage bills and expenses' },
  { key: 'advances', label: 'Advances', description: 'Manage advance payments' },
  { key: 'reports', label: 'Reports', description: 'Generate and view financial reports' },
  { key: 'members', label: 'Members', description: 'Manage church member records' },
]

export const PERMISSION_ACTIONS: PermissionAction[] = [
  { key: 'create', label: 'Create', description: 'Can create new records' },
  { key: 'read', label: 'View', description: 'Can view and read records' },
  { key: 'update', label: 'Edit', description: 'Can modify existing records' },
  { key: 'delete', label: 'Delete', description: 'Can delete records' },
]