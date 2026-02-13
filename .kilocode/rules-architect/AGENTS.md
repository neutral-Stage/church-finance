# Project Architecture Rules (Non-Obvious Only)

- **Multi-church tenancy is the core constraint**: every table has `church_id`; forgetting it breaks data isolation between churches
- **Dual-client pattern is mandatory**: `createServerClient()` (auth-scoped, respects RLS) for reads; `createAdminClient()` (service role, bypasses RLS) for writes — mixing them up causes silent permission failures
- **Church context flows through two parallel systems**: client-side via `ChurchContext` + `churchApi` singleton; server-side via `selectedChurch` cookie parsed in `lib/server-church-context.ts`
- **No test infrastructure**: validation relies solely on `npm run check` (lint + tsc). Any new features need manual verification
- **RLS policies are complex**: multiple SQL fix scripts in root suggest ongoing RLS issues. New tables MUST have RLS policies scoped by `church_id`
- **API routes are the only data mutation layer**: client components never write to Supabase directly; they call API routes which handle auth + church scoping
- **`get_user_churches` RPC** is the canonical way to determine which churches a user can access — do not query `user_church_roles` directly
