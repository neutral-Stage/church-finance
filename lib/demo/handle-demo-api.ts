import { NextRequest, NextResponse } from 'next/server'
import * as fixtures from '@/lib/demo/fixtures'
import { DEMO_MINIMAL_AUTH, demoSelectedChurchJson, DEMO_USER_ID } from '@/lib/demo/constants'

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

  return null
}
