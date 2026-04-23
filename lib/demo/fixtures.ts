import type {
  AuthUser,
  AdvanceWithFund,
  BillWithFund,
  Database,
  Fund,
  FundSummary,
  TransactionWithFund,
} from '@/types/database'
import type {
  BillsData,
  AdvancesData,
  CashBreakdownData,
  DashboardData,
  FundsPageData,
  LedgerEntryWithRelations,
  Member,
  MemberContribution,
  NotificationData,
  OfferingsData,
  ReportsData,
  TransactionsData,
} from '@/lib/server-data'
import {
  DEMO_CHURCH_ID,
  DEMO_FUND_BUILDING,
  DEMO_FUND_GENERAL,
  DEMO_USER_ID,
} from '@/lib/demo/constants'

const now = new Date().toISOString()
const month = new Date().toISOString().slice(0, 7)

const demoFundGeneral: Fund = {
  id: DEMO_FUND_GENERAL,
  church_id: DEMO_CHURCH_ID,
  name: 'General Fund',
  description: 'Operating budget',
  fund_type: 'general',
  current_balance: 42500.5,
  target_amount: 50000,
  is_active: true,
  created_at: now,
  updated_at: now,
  created_by: DEMO_USER_ID,
}

const demoFundBuilding: Fund = {
  id: DEMO_FUND_BUILDING,
  church_id: DEMO_CHURCH_ID,
  name: 'Building Fund',
  description: 'Capital improvements',
  fund_type: 'building',
  current_balance: 18200,
  target_amount: 100000,
  is_active: true,
  created_at: now,
  updated_at: now,
  created_by: DEMO_USER_ID,
}

function asFundSummary(
  f: Fund,
  stats: { total_income: number; total_expenses: number; total_offerings: number; transaction_count: number }
): FundSummary {
  return {
    id: f.id,
    church_id: f.church_id,
    name: f.name,
    created_at: f.created_at,
    current_balance: f.current_balance,
    fund_type: f.fund_type,
    is_active: f.is_active ?? true,
    total_income: stats.total_income,
    total_expenses: stats.total_expenses,
    total_offerings: stats.total_offerings,
    transaction_count: stats.transaction_count,
  } as FundSummary
}

const demoTx1: TransactionWithFund = {
  id: '00000000-0000-4000-8000-000000000301',
  church_id: DEMO_CHURCH_ID,
  fund_id: DEMO_FUND_GENERAL,
  amount: 1200,
  category: 'Donation',
  description: 'Sunday offering deposit',
  transaction_date: `${month}-05`,
  type: 'income',
  payment_method: 'check',
  receipt_number: null,
  created_at: now,
  created_by: DEMO_USER_ID,
  fund: demoFundGeneral,
}

const demoTx2: TransactionWithFund = {
  id: '00000000-0000-4000-8000-000000000302',
  church_id: DEMO_CHURCH_ID,
  fund_id: DEMO_FUND_GENERAL,
  amount: 450.75,
  category: 'Utilities',
  description: 'Electric bill — fellowship hall',
  transaction_date: `${month}-12`,
  type: 'expense',
  payment_method: 'ach',
  receipt_number: 'UTIL-4412',
  created_at: now,
  created_by: DEMO_USER_ID,
  fund: demoFundGeneral,
}

const demoBill1: BillWithFund = {
  id: '00000000-0000-4000-8000-000000000401',
  church_id: DEMO_CHURCH_ID,
  fund_id: DEMO_FUND_GENERAL,
  vendor_name: 'Regional Insurance Co.',
  amount: 890,
  due_date: `${month}-28`,
  frequency: 'monthly',
  category: 'Insurance',
  status: 'pending',
  notes: 'Property liability',
  allocation_percentage: null,
  approval_status: null,
  approved_at: null,
  approved_by: null,
  created_at: now,
  updated_at: null,
  document_name: null,
  document_size: null,
  document_type: null,
  document_uploaded_at: null,
  document_url: null,
  ledger_entry_id: null,
  ledger_subgroup_id: null,
  metadata: null,
  priority: 'normal',
  responsible_parties: null,
  sort_order: null,
  fund: demoFundGeneral,
  funds: demoFundGeneral,
}

const demoAdvance1: AdvanceWithFund = {
  id: '00000000-0000-4000-8000-000000000501',
  church_id: DEMO_CHURCH_ID,
  fund_id: DEMO_FUND_GENERAL,
  recipient_name: 'Youth Retreat Vendor',
  amount: 2000,
  amount_returned: 500,
  advance_date: `${month}-01`,
  expected_return_date: `${month}-20`,
  payment_method: 'check',
  purpose: 'Retreat deposit',
  status: 'outstanding',
  notes: 'Balance due after event',
  approved_by: DEMO_USER_ID,
  created_at: now,
  funds: demoFundGeneral,
}

const demoOffering1: Database['public']['Tables']['offerings']['Row'] = {
  id: '00000000-0000-4000-8000-000000000601',
  church_id: DEMO_CHURCH_ID,
  amount: 3500,
  service_date: `${month}-02`,
  type: 'tithe',
  notes: 'Combined plate',
  fund_allocations: { [DEMO_FUND_GENERAL]: 3500 },
  created_at: now,
}

export const demoAuthUser: AuthUser = {
  id: DEMO_USER_ID,
  email: 'demo.treasurer@example.com',
  role: 'treasurer',
  full_name: 'Alex Treasurer',
  phone: '555-0100',
  address: '100 Demo Street',
  bio: 'Demo account',
  avatar_url: null,
  created_at: now,
  updated_at: now,
}

export function getDemoDashboardData(): DashboardData {
  return {
    funds: [
      asFundSummary(demoFundGeneral, { total_income: 40000, total_expenses: 12000, total_offerings: 18000, transaction_count: 14 }),
      asFundSummary(demoFundBuilding, { total_income: 22000, total_expenses: 7500, total_offerings: 10000, transaction_count: 9 }),
    ],
    recentTransactions: [demoTx1, demoTx2],
    upcomingBills: [demoBill1],
    outstandingAdvances: [demoAdvance1],
    monthlyStats: { income: 6200, expenses: 2100, netIncome: 4100 },
  }
}

export function getDemoTransactionsData(): TransactionsData {
  return {
    transactions: [demoTx1, demoTx2],
    funds: [demoFundGeneral, demoFundBuilding],
  }
}

export function getDemoMembers(): Member[] {
  return [
    {
      id: '00000000-0000-4000-8000-000000000701',
      church_id: DEMO_CHURCH_ID,
      name: 'Jordan Lee',
      phone: '555-0142',
      fellowship_name: 'Young Adults',
      job: 'Teacher',
      location: 'North Campus',
      created_at: now,
      updated_at: now,
    },
    {
      id: '00000000-0000-4000-8000-000000000702',
      church_id: DEMO_CHURCH_ID,
      name: 'Sam Rivera',
      phone: '555-0199',
      fellowship_name: 'Seniors',
      job: 'Retired',
      location: 'Downtown',
      created_at: now,
      updated_at: now,
    },
  ]
}

export function getDemoBillsData(): BillsData {
  return {
    bills: [demoBill1],
    funds: [demoFundGeneral, demoFundBuilding],
  }
}

export function getDemoAdvancesData(): AdvancesData {
  return { advances: [demoAdvance1], funds: [demoFundGeneral, demoFundBuilding] }
}

export function getDemoOfferingsData(): OfferingsData {
  return {
    offerings: [demoOffering1],
    funds: [demoFundGeneral, demoFundBuilding],
  }
}

export function getDemoCashBreakdown(): CashBreakdownData[] {
  return [
    { id: 'cb1', fund_type: 'general', denomination: 20, count: 40, total_amount: 800 },
    { id: 'cb2', fund_type: 'general', denomination: 10, count: 55, total_amount: 550 },
    { id: 'cb3', fund_type: 'general', denomination: 5, count: 30, total_amount: 150 },
  ]
}

export function getDemoFundsPageData(): FundsPageData {
  return {
    funds: [demoFundGeneral, demoFundBuilding],
    recentTransactions: [demoTx1, demoTx2],
  }
}

export function getDemoLedgerEntries(): LedgerEntryWithRelations[] {
  return [
    {
      id: '00000000-0000-4000-8000-000000000801',
      title: 'Facilities & Operations',
      description: 'Recurring facility costs',
      total_amount: 12000,
      status: 'active',
      priority: 'high',
      approval_status: 'approved',
      approved_at: now,
      approved_by: DEMO_USER_ID,
      created_at: now,
      updated_at: now,
      created_by: DEMO_USER_ID,
      default_due_date: null,
      default_fund_id: DEMO_FUND_GENERAL,
      metadata: null,
      notes: null,
      responsible_parties: ['Facilities team'],
      ledger_subgroups: [
        {
          id: '00000000-0000-4000-8000-000000000811',
          ledger_entry_id: '00000000-0000-4000-8000-000000000801',
          title: 'Utilities subgroup',
          description: null,
          total_amount: 4000,
          status: 'active',
          priority: 'normal',
          created_at: now,
          updated_at: now,
          created_by: DEMO_USER_ID,
          default_due_date: null,
          default_fund_id: DEMO_FUND_GENERAL,
          metadata: null,
          notes: null,
          responsible_parties: null,
          sort_order: 1,
          allocation_percentage: null,
          purpose: null,
          bills: [demoBill1],
        },
      ],
      bills: [],
    },
  ]
}

export function getDemoNotifications(): NotificationData[] {
  return [
    {
      id: 'n1',
      title: 'Bill due soon',
      message: `${demoBill1.vendor_name} is due ${demoBill1.due_date}.`,
      type: 'warning',
      category: 'bill',
      read: false,
      created_at: now,
      action_url: '/bills',
    },
    {
      id: 'n2',
      title: 'Welcome (demo)',
      message: 'You are viewing sample data. Changes are not saved to a database.',
      type: 'info',
      category: 'system',
      read: false,
      created_at: now,
    },
  ]
}

export function getDemoReportsData(_range: { startDate: string; endDate: string }): ReportsData {
  void _range
  return {
    transactions: [demoTx1, demoTx2],
    offerings: [demoOffering1],
    bills: [demoBill1],
    advances: [demoAdvance1],
    funds: [demoFundGeneral, demoFundBuilding],
  }
}

export function getDemoMemberContributions(): MemberContribution[] {
  const m1 = getDemoMembers()[0]!
  const m2 = getDemoMembers()[1]!
  return [
    {
      member: {
        id: m1.id,
        name: m1.name,
        phone: m1.phone,
        fellowship_name: m1.fellowship_name,
        job: m1.job,
        location: m1.location,
      },
      contributions: [
        {
          id: demoOffering1.id,
          service_date: demoOffering1.service_date,
          type: 'tithe',
          amount: 220,
          fund_name: 'General Fund',
        },
        {
          id: '00000000-0000-4000-8000-000000000602',
          service_date: `${month}-18`,
          type: 'special',
          amount: 100,
          fund_name: 'Building Fund',
        },
      ],
      total_amount: 320,
      contribution_count: 2,
      last_contribution_date: demoOffering1.service_date,
      missing_months: 2,
      missing_months_list: [],
      average_monthly_amount: 160,
      average_annual_amount: 320,
      months_with_contributions: 2,
    },
    {
      member: {
        id: m2.id,
        name: m2.name,
        phone: m2.phone,
        fellowship_name: m2.fellowship_name,
        job: m2.job,
        location: m2.location,
      },
      contributions: [
        {
          id: '00000000-0000-4000-8000-000000000603',
          service_date: `${month}-10`,
          type: 'tithe',
          amount: 180,
          fund_name: 'General Fund',
        },
      ],
      total_amount: 180,
      contribution_count: 1,
      last_contribution_date: `${month}-10`,
      missing_months: 3,
      missing_months_list: [],
      average_monthly_amount: 180,
      average_annual_amount: 180,
      months_with_contributions: 1,
    },
  ]
}
