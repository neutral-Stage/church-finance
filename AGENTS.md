# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build & Run

- `npm run check` runs both lint and type-check (`next lint && tsc --noEmit`)
- No test framework is configured; there are no automated tests

## Architecture (Non-Obvious)

- **Multi-church tenancy**: Every data entity is scoped by `church_id`. All API mutations MUST include `church_id` in the request body; all GET requests append `church_id` as a query param via `churchApi` singleton in [`lib/church-aware-api.ts`](lib/church-aware-api.ts)
- **Dual Supabase clients**: API routes use `createServerClient()` for auth-scoped reads and `createAdminClient()` (service role, bypasses RLS) for writes. Both are in [`lib/supabase-server.ts`](lib/supabase-server.ts). The client-side singleton is in [`lib/supabase.ts`](lib/supabase.ts)
- **Church selection**: Server-side reads `selectedChurch` cookie (JSON); falls back to `user_preferences` table then first available church via `get_user_churches` RPC. See [`lib/server-church-context.ts`](lib/server-church-context.ts)
- **Retry wrapper**: All Supabase queries in API routes should use `retrySupabaseQuery()` from [`lib/retry-utils.ts`](lib/retry-utils.ts) with network-error retry conditions
- **Route export**: API routes that use cookies/auth must export `const dynamic = 'force-dynamic'`

## Code Style

- `@typescript-eslint/no-explicit-any` is OFF — `any` casts are used extensively (especially for Supabase query results)
- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/types/database`)
- Currency is BDT (৳) — use `formatCurrency()` from [`lib/utils.ts`](lib/utils.ts)
- UI components use shadcn/ui (Radix + Tailwind + `cn()` helper); config in [`components.json`](components.json)
- State management: Zustand for global state, React Context for auth (`AuthContext`) and church selection (`ChurchContext`)

## Types

- All Supabase types are generated in [`types/supabase-generated.ts`](types/supabase-generated.ts); re-exported with helper aliases (`Tables<>`, `Insertable<>`, `Updatable<>`) from [`types/database.ts`](types/database.ts)
- `Insertable<>` intentionally makes `church_id` optional (it's injected by the API layer)

## AI Features

- Primary AI provider is Groq (llama-3.3-70b); Google AI for embeddings. Config in [`lib/ai/ai-config.ts`](lib/ai/ai-config.ts)
