-- SaaS foundation: organizations, plans, invitations, church onboarding

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly_cents integer NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT 3,
  max_transactions_per_year integer NOT NULL DEFAULT 500,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (id, name, price_monthly_cents, max_users, max_transactions_per_year, features)
VALUES
  ('free', 'Free', 0, 3, 500, '{"audit_export": false, "scheduled_reports": false}'::jsonb),
  ('starter', 'Starter', 2900, 10, 5000, '{"audit_export": true, "scheduled_reports": false}'::jsonb),
  ('pro', 'Pro', 7900, 50, 50000, '{"audit_export": true, "scheduled_reports": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.churches
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_id text REFERENCES public.plans(id) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.church_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS church_invitations_token_idx ON public.church_invitations (token);
CREATE INDEX IF NOT EXISTS church_invitations_church_idx ON public.church_invitations (church_id);

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (church_id, year, month)
);

CREATE TABLE IF NOT EXISTS public.member_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
