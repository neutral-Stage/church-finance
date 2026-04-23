export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_CHURCH_ID = '00000000-0000-4000-8000-000000000002'
export const DEMO_FUND_GENERAL = '00000000-0000-4000-8000-000000000101'
export const DEMO_FUND_BUILDING = '00000000-0000-4000-8000-000000000102'
export const DEMO_ROLE_TREASURER = '00000000-0000-4000-8000-000000000201'
export const DEMO_ROLE_ADMIN = '00000000-0000-4000-8000-000000000202'

export const DEMO_MINIMAL_AUTH = {
  user_id: DEMO_USER_ID,
  email: 'demo.treasurer@example.com',
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
}

export function demoSelectedChurchJson() {
  return JSON.stringify({
    id: DEMO_CHURCH_ID,
    name: 'Grace Fellowship (Demo)',
    type: 'Main',
    role_name: 'treasurer',
    role_display_name: 'Treasurer',
    role: { name: 'treasurer', display_name: 'Treasurer' },
  })
}
