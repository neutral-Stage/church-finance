-- Budgets: per-church fund/category planning
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  fund_id uuid REFERENCES public.funds(id) ON DELETE SET NULL,
  category text NOT NULL,
  year integer NOT NULL,
  month integer,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budgets_church_year_idx ON public.budgets (church_id, year);
CREATE INDEX IF NOT EXISTS budgets_fund_idx ON public.budgets (fund_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_select ON public.budgets FOR SELECT
  USING (public.check_user_permission(auth.uid()::text, church_id::text, 'budgets', 'read'));

CREATE POLICY budgets_insert ON public.budgets FOR INSERT
  WITH CHECK (public.check_user_permission(auth.uid()::text, church_id::text, 'budgets', 'create'));

CREATE POLICY budgets_update ON public.budgets FOR UPDATE
  USING (public.check_user_permission(auth.uid()::text, church_id::text, 'budgets', 'update'));

CREATE POLICY budgets_delete ON public.budgets FOR DELETE
  USING (public.check_user_permission(auth.uid()::text, church_id::text, 'budgets', 'delete'));
