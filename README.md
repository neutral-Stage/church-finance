# Church Finance

Web application for managing church finances: **funds**, **transactions**, **members**, **bills**, **offerings**, **advances**, **ledger**, **reports**, and **notifications**.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript  
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)  
- [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS)

## Features

- Multi-fund accounting with balances and history  
- Income and expense transactions with categories  
- Member directory and contribution views  
- Bills, advances, petty cash, and cash breakdown  
- Dashboard, monthly-style stats, and export-oriented reports  
- Role-aware UI (viewer / treasurer / admin patterns)  
- Optional AI assistant (Groq) when configured  

## Quick start (demo mode)

No database required for a **local UI tour** with sample data:

```bash
git clone https://github.com/neutral-Stage/church-finance.git
cd church-finance
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Then:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Demo mode seeds auth/church cookies and uses mock APIs plus server-side fixtures. **Edits are not persisted.**

## Production-style setup (your own Supabase)

1. Copy env file: `cp .env.example .env.local`  
2. In `.env.local`, set `NEXT_PUBLIC_DEMO_MODE=false` (or remove it).  
3. Create a Supabase project and add **Project URL**, **anon (publishable) key**, and **service role key** as in `.env.example`.  
4. Apply your database schema and RLS policies. The canonical migration history for maintainers may live in a **private** mirror of this repo (see note below).  
5. Optionally set `GROQ_API_KEY` for live AI chat.  
6. `pnpm install && pnpm dev` — or deploy to [Vercel](https://vercel.com/) with the same env vars.

## Scripts

```bash
pnpm dev      # development server
pnpm build    # production build
pnpm start    # run production build locally
pnpm lint     # ESLint
pnpm check    # lint + TypeScript (tsc --noEmit)
```

## Screenshots

_(Placeholder: add `docs/screenshots/` images and link them here.)_

## Repository layout note

This public repository is trimmed for **secrets hygiene** (internal docs, one-off SQL, and tooling may be omitted or gitignored). A **private** mirror for this project was created at [neutral-Stage/church-finance-private](https://github.com/neutral-Stage/church-finance-private) to retain the full tree (including `scripts/`, `supabase/`, and internal markdown) for maintainers. Adjust the remote name/URL if you fork under a different org.

## Security

- Never commit `.env`, `.env.local`, or real API keys.  
- Do not point `NEXT_PUBLIC_DEMO_MODE=true` at production Supabase or production domains.  
- Service role keys must stay **server-only** (never `NEXT_PUBLIC_*`).  

## License

Add your preferred `LICENSE` file for open source terms.
