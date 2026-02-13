# Project Debug Rules (Non-Obvious Only)

- No test framework exists — validation is manual via `npm run check` (lint + type-check)
- Server-side church context logs are commented out by default in `lib/server-church-context.ts`; uncomment `[ServerChurchContext]` lines for church-selection debugging
- `createAdminClient()` logs creation to console — look for `[AdminClient]` prefix to trace service-role usage
- Cookie-based auth issues: check `selectedChurch` cookie (JSON blob) and Supabase auth cookies in middleware
- RLS bypass writes use `createAdminClient()` — if writes fail silently, verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Network errors in Supabase queries are retried via `retrySupabaseQuery()`; check `logNetworkError()` output for connectivity issues
- Multiple SQL debug/fix scripts exist in project root (e.g., `debug_church_filtering.sql`, `emergency_rls_fix.sql`) for Supabase schema debugging
