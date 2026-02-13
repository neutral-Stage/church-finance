# Project Documentation Rules (Non-Obvious Only)

- `lib/supabase.ts` is client-side only; `lib/supabase-server.ts` is server-side only — names are misleading since both export `createServerClient`
- `types/supabase-generated.ts` is auto-generated (80K+ chars) — never edit manually; use `types/database.ts` for helper aliases
- Dashboard pages under `app/(dashboard)/` are thin wrappers that delegate to client components in `components/`
- `contexts/ChurchContext.tsx` manages client-side church selection; `lib/server-church-context.ts` is the server-side equivalent — two parallel systems
- Root-level `.sql` and `.md` files are historical debugging artifacts, not project documentation
- AI features span `lib/ai/` (config, service, vector search) with Groq as primary LLM and Google AI for embeddings
