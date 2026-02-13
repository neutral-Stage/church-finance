# Project Coding Rules (Non-Obvious Only)

- API routes: use `createServerClient()` for reads, `createAdminClient()` for writes (bypasses RLS). Both from `@/lib/supabase-server`
- Every API route using cookies/auth MUST export `const dynamic = 'force-dynamic'`
- Wrap all Supabase queries in `retrySupabaseQuery()` from `@/lib/retry-utils` with network-error retry conditions
- All mutations MUST include `church_id` in the request body; GET routes receive it as a query param
- Client-side API calls should use the `churchApi` singleton from `@/lib/church-aware-api` — it auto-injects church context
- `Insertable<>` type makes `church_id` optional — the API layer injects it, not the caller
- `any` casts on Supabase results are intentional (e.g., `(adminSupabase.from('table') as any)`) to work around generated type limitations
- Use `formatCurrency()` from `@/lib/utils` for all BDT (৳) currency display
- shadcn/ui components live in `components/ui/`; use `cn()` from `@/lib/utils` for class merging
