import { NextRequest, NextResponse } from 'next/server'
import * as fixtures from '@/lib/demo/fixtures'
import { DEMO_MINIMAL_AUTH, demoSelectedChurchJson, DEMO_USER_ID, DEMO_CHURCH_ID } from '@/lib/demo/constants'

/**
 * Short-circuit API routes in demo mode (Edge-safe: no Node-only APIs).
 * Return null to fall through to the real route handler.
 */
export function handleDemoApiRequest(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname
  const method = request.method

  const json = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, {
      ...init,
      headers: {
        'Cache-Control': 'no-store',
        ...(init?.headers as Record<string, string>),
      },
    })

  const withDemoCookies = (res: NextResponse) => {
    res.cookies.set('church-auth-minimal', JSON.stringify(DEMO_MINIMAL_AUTH), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    res.cookies.set('selectedChurch', demoSelectedChurchJson(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  }

  if (method === 'POST' && pathname === '/api/auth/signin') {
    const res = json({
      success: true,
      user: {
        id: fixtures.demoAuthUser.id,
        email: fixtures.demoAuthUser.email,
        role: fixtures.demoAuthUser.role,
        user_metadata: { full_name: fixtures.demoAuthUser.full_name },
      },
    })
    return withDemoCookies(res)
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    return json({ user: fixtures.demoAuthUser })
  }

  if (method === 'GET' && pathname === '/api/auth/session') {
    return json({ session: null })
  }

  if (method === 'POST' && pathname === '/api/auth/signout') {
    const res = json({ success: true })
    res.cookies.delete('church-auth-minimal')
    res.cookies.delete('selectedChurch')
    return res
  }

  if (method === 'GET' && pathname === '/api/church-selection') {
    return json({ church: JSON.parse(demoSelectedChurchJson()) })
  }

  if (method === 'POST' && pathname === '/api/church-selection') {
    return withDemoCookies(json({ success: true, message: 'Demo mode', church: JSON.parse(demoSelectedChurchJson()) }))
  }

  if (method === 'GET' && pathname === '/api/churches') {
    const church = JSON.parse(demoSelectedChurchJson())
    return json({
      churches: [
        {
          id: church.id,
          name: church.name,
          type: church.type,
          is_active: true,
          created_at: new Date().toISOString(),
          address: '100 Demo Street',
          phone: '555-0100',
          email: 'office@example.com',
          description: 'Demo congregation',
          established_date: '1998-01-01',
          settings: null,
          updated_at: new Date().toISOString(),
          website: 'https://example.com',
          user_church_roles: [
            {
              id: 'ucr-demo-1',
              user_id: DEMO_USER_ID,
              church_id: church.id,
              role_id: '00000000-0000-4000-8000-000000000201',
              is_active: true,
              roles: { name: 'treasurer', display_name: 'Treasurer' },
            },
          ],
        },
      ],
    })
  }

  if (method === 'POST' && pathname === '/api/churches') {
    return json({ success: true, demo: true, church: { id: 'new-demo-id', name: 'New Church (demo)' } })
  }

  if (method.match(/^(PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/churches/')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname === '/api/roles') {
    const now = new Date().toISOString()
    const base = { description: null, created_at: now, updated_at: now, is_active: true, is_system_role: true, permissions: {} }
    return json({
      roles: [
        { id: '00000000-0000-4000-8000-000000000201', name: 'treasurer', display_name: 'Treasurer', ...base },
        { id: '00000000-0000-4000-8000-000000000202', name: 'admin', display_name: 'Admin', ...base },
        { id: '00000000-0000-4000-8000-000000000203', name: 'viewer', display_name: 'Viewer', ...base },
        { id: '00000000-0000-4000-8000-000000000204', name: 'super_admin', display_name: 'Super Admin', ...base },
      ],
    })
  }

  if (method === 'POST' && pathname === '/api/roles') {
    return json({ success: true, demo: true, role: { id: 'new-role', name: 'viewer' } })
  }

  if (method.match(/^(PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/roles/')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname === '/api/admin/users') {
    return json({
      users: [
        {
          id: DEMO_USER_ID,
          email: fixtures.demoAuthUser.email,
          full_name: fixtures.demoAuthUser.full_name,
          role: 'treasurer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          church_roles: [],
        },
      ],
    })
  }

  if (method === 'GET' && pathname === '/api/admin/churches-overview') {
    const c = JSON.parse(demoSelectedChurchJson())
    const funds = fixtures.getDemoFundsPageData().funds
    return json({
      churches: [
        {
          ...c,
          is_active: true,
          created_at: new Date().toISOString(),
          address: null,
          phone: null,
          email: null,
          description: null,
          established_date: null,
          website: null,
          settings: null,
          updated_at: new Date().toISOString(),
          totalFunds: 2,
          totalBalance: 60700.5,
          memberCount: 2,
          recentTransactions: 8,
          funds: [
            { id: funds[0]!.id, name: funds[0]!.name, balance: funds[0]!.current_balance || 0, fund_type: funds[0]!.fund_type },
            { id: funds[1]!.id, name: funds[1]!.name, balance: funds[1]!.current_balance || 0, fund_type: funds[1]!.fund_type },
          ],
        },
      ],
      systemStats: {
        totalChurches: 1,
        activeChurches: 1,
        totalSystemBalance: 60700.5,
        totalMembers: 3,
        totalTransactionsThisMonth: 6,
      },
    })
  }

  if (method === 'GET' && pathname === '/api/admin/churches/financial') {
    const c = JSON.parse(demoSelectedChurchJson())
    return json({
      churches: [
        {
          id: c.id,
          name: c.name,
          type: c.type,
          is_active: true,
          created_at: new Date().toISOString(),
          address: null,
          phone: null,
          email: null,
          description: null,
          established_date: null,
          funds: {
            total_funds: 2,
            active_funds: 2,
            total_balance: 60700.5,
            total_income: 62000,
            total_expenses: 19500,
            fund_types: { general: 42500.5, building: 18200 },
          },
          recent_activity: {
            transactions_last_30_days: 8,
            offerings_last_30_days: 4,
            bills_pending: 1,
            advances_outstanding: 1,
          },
          user_count: 3,
        },
      ],
      summary: {
        total_churches: 1,
        active_churches: 1,
        total_system_balance: 60700.5,
        total_system_income: 62000,
        total_system_expenses: 19500,
        total_funds: 2,
        avg_balance_per_church: 60700.5,
      },
    })
  }

  if (method === 'GET' && pathname.startsWith('/api/user-church-roles')) {
    return json({
      userChurchRoles: [
        {
          id: 'ucr-1',
          user_id: DEMO_USER_ID,
          church_id: JSON.parse(demoSelectedChurchJson()).id,
          role_id: '00000000-0000-4000-8000-000000000201',
          is_active: true,
          user: fixtures.demoAuthUser,
          church: JSON.parse(demoSelectedChurchJson()),
          role: { id: '00000000-0000-4000-8000-000000000201', name: 'treasurer', display_name: 'Treasurer' },
        },
      ],
    })
  }

  if (method === 'POST' && pathname === '/api/user-church-roles') {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname === '/api/notifications') {
    return json({ notifications: fixtures.getDemoNotifications() })
  }

  if (method !== 'GET' && pathname.startsWith('/api/notifications')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname === '/api/funds') {
    return json({ funds: fixtures.getDemoFundsPageData().funds, success: true })
  }

  if (method === 'POST' && pathname === '/api/funds') {
    return json({ success: true, demo: true, fund: { id: 'new-fund', name: 'New Fund' } })
  }

  if (method.match(/^(PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/funds/') && !pathname.includes('/transfer')) {
    return json({ success: true, demo: true })
  }

  if (method === 'POST' && pathname === '/api/funds/transfer') {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/transactions')) {
    return json({ transactions: fixtures.getDemoTransactionsData().transactions, success: true })
  }

  if (method.match(/^(PUT|PATCH|DELETE|POST)$/) && pathname.startsWith('/api/transactions')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/ledger-entries')) {
    return json({ ledgerEntries: fixtures.getDemoLedgerEntries() })
  }

  if (method === 'POST' && pathname === '/api/ledger-entries') {
    return json({ success: true, demo: true })
  }

  if (pathname.startsWith('/api/ledger-subgroups')) {
    return json({ success: true, demo: true, ledgerSubgroups: [] })
  }

  if (method === 'GET' && pathname.startsWith('/api/members')) {
    return json({ members: fixtures.getDemoMembers() })
  }

  if (method.match(/^(POST|PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/members')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/bills')) {
    return json({ bills: fixtures.getDemoBillsData().bills, success: true })
  }

  if (method.match(/^(POST|PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/bills')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/advances')) {
    return json({ advances: fixtures.getDemoAdvancesData().advances, success: true })
  }

  if (method.match(/^(POST|PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/advances')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/offerings')) {
    return json({ offerings: fixtures.getDemoOfferingsData().offerings, success: true })
  }

  if (method.match(/^(POST|PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/offerings')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname.startsWith('/api/petty-cash')) {
    return json({ pettyCash: [], success: true })
  }

  if (method.match(/^(POST|PUT|PATCH|DELETE)$/) && pathname.startsWith('/api/petty-cash')) {
    return json({ success: true, demo: true })
  }

  if (pathname.startsWith('/api/document-attachments')) {
    return json({ attachments: [], success: true, demo: true })
  }

  if (method === 'POST' && pathname === '/api/ai-chat') {
    return json({
      content:
        'Demo mode: this is a static reply. Add GROQ_API_KEY to .env.local and turn off NEXT_PUBLIC_DEMO_MODE for live AI.',
      demo: true,
    })
  }

  if (pathname.startsWith('/api/notifications/generate')) {
    return json({ success: true, demo: true })
  }

  if (method === 'GET' && pathname === '/api/budgets') {
    const year = new URL(request.url).searchParams.get('year')
    let budgets = fixtures.getDemoBudgets()
    if (year) budgets = budgets.filter((b) => b.year === parseInt(year, 10))
    return json({ budgets, success: true })
  }

  if (method.match(/^(POST|PUT|DELETE)$/) && pathname === '/api/budgets') {
    return json({ success: true, demo: true, budget: fixtures.getDemoBudgets()[0] })
  }

  if (method === 'GET' && pathname === '/api/admin/audit') {
    return json({ entries: fixtures.getDemoAuditLog(), success: true })
  }

  if (pathname.startsWith('/api/import/')) {
    if (method === 'GET') {
      return json({ rows: fixtures.getDemoImportStaging(), success: true })
    }
    return json({ success: true, demo: true, imported: 0 })
  }

  if (method === 'GET' && pathname === '/api/giving-statements') {
    return json({
      success: true,
      demo: true,
      statement: { memberName: 'Demo Member', total: 1200, year: new Date().getFullYear() },
    })
  }

  if (method === 'POST' && pathname === '/api/notifications/send') {
    return json({ success: true, demo: true, sent: 0 })
  }

  if (pathname.startsWith('/api/onboarding')) {
    return json({ success: true, demo: true })
  }

  if (pathname.startsWith('/api/invitations')) {
    if (pathname === '/api/invitations/accept' && method === 'POST') {
      return json({ success: true, demo: true, churchName: 'Grace Fellowship (Demo)' })
    }
    if (method === 'GET') {
      return json({ success: true, demo: true, invitations: [] })
    }
    if (method === 'POST') {
      return json({
        success: true,
        demo: true,
        invitation: {
          id: 'demo-invite-1',
          email: 'invitee@example.com',
          church_id: DEMO_CHURCH_ID,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      })
    }
    if (method === 'DELETE') {
      return json({ success: true, demo: true })
    }
    return json({ success: true, demo: true, invitations: [] })
  }

  if (pathname.startsWith('/api/admin/platform')) {
    return json({
      success: true,
      demo: true,
      churches: [
        {
          id: DEMO_CHURCH_ID,
          name: 'Grace Fellowship (Demo)',
          type: 'church',
          is_active: true,
          plan_name: 'Free',
          plan_status: 'free',
          health: 'good',
          last_activity_at: new Date().toISOString(),
          member_count: 3,
          total_balance: 125000,
          transactions_last_30_days: 12,
        },
      ],
      systemStats: {
        total_churches: 1,
        active_churches: 1,
        suspended_churches: 0,
        healthy_churches: 1,
        at_risk_churches: 0,
      },
    })
  }

  if (pathname.startsWith('/api/billing')) {
    if (pathname.includes('/status') && method === 'GET') {
      return json({
        success: true,
        demo: true,
        billing: {
          churchId: 'demo',
          planId: 'free',
          planName: 'Free',
          priceMonthlyCents: 0,
          subscriptionStatus: null,
          stripeCustomerId: null,
          stripeConfigured: false,
          usage: {
            users: { usage: 2, limit: 3 },
            transactions: { usage: 42, limit: 500 },
            members: { usage: 18, limit: 250 },
            churches: { usage: 1, limit: 1 },
          },
          features: {
            auditExport: false,
            scheduledReports: false,
            prioritySupport: false,
          },
        },
      })
    }

    return json({
      success: true,
      demo: true,
      message: 'Stripe billing is not configured (demo mode)',
      plan: { id: 'free', name: 'Free' },
      subscription: null,
    })
  }

  if (pathname.startsWith('/api/approvals')) {
    if (method === 'GET') {
      const demoBill = fixtures.getDemoBillsData().bills[0]
      return json({
        success: true,
        demo: true,
        count: 2,
        items: [
          {
            id: demoBill?.id ?? 'demo-bill-1',
            entity_type: 'bill',
            title: demoBill?.vendor_name ?? 'Demo Vendor',
            description: demoBill?.notes,
            amount: demoBill?.amount ?? 0,
            submitted_at: demoBill?.created_at ?? new Date().toISOString(),
            metadata: { due_date: demoBill?.due_date, status: demoBill?.status },
          },
          {
            id: '00000000-0000-4000-8000-000000000601',
            entity_type: 'ledger_entry',
            title: 'Youth camp ledger',
            description: 'Pending ledger approval for camp expenses',
            amount: 1500,
            submitted_at: demoBill?.created_at ?? new Date().toISOString(),
          },
        ],
      })
    }
    if (method === 'POST') {
      return json({ success: true, demo: true, action: 'approve' })
    }
    return json({ success: true, demo: true, items: [] })
  }

  if (pathname.startsWith('/api/member-portal') && method === 'GET') {
    const year = new Date().getFullYear()
    return json({
      success: true,
      demo: true,
      member: { id: 'demo-member-1', name: 'Demo Member' },
      churchName: 'Grace Fellowship (Demo)',
      year,
      contributions: [
        {
          id: 'demo-offering-1',
          service_date: `${year}-06-02`,
          type: 'tithe',
          amount: 220,
          fund_name: 'General Fund',
        },
        {
          id: 'demo-offering-2',
          service_date: `${year}-05-18`,
          type: 'special',
          amount: 100,
          fund_name: 'Building Fund',
        },
      ],
      totalAmount: 320,
    })
  }

  if (pathname.startsWith('/api/giving/online') && method === 'POST') {
    return json({
      success: true,
      demo: true,
      stripeConfigured: false,
      paymentIntentId: `demo_pi_${Date.now()}`,
      message: 'Donation recorded in demo mode. Configure Stripe for live payments.',
    })
  }

  return null
}
