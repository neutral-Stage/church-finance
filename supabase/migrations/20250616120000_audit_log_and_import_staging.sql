-- Audit log for financial mutations
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_church_created_idx ON public.audit_log (church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log (entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON public.audit_log FOR SELECT
  USING (
    church_id IS NULL
    OR public.check_user_permission(auth.uid()::text, church_id::text, 'audit', 'read')
  );

-- Import staging for bank/CSV reconciliation
CREATE TABLE IF NOT EXISTS public.import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  import_type text NOT NULL,
  row_data jsonb NOT NULL,
  parsed_amount numeric,
  parsed_date date,
  parsed_description text,
  matched_entity_id text,
  matched_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_staging_church_status_idx ON public.import_staging (church_id, status);

ALTER TABLE public.import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_staging_church ON public.import_staging FOR ALL
  USING (public.check_user_permission(auth.uid()::text, church_id::text, 'transactions', 'read'))
  WITH CHECK (public.check_user_permission(auth.uid()::text, church_id::text, 'transactions', 'create'));

-- Email delivery tracking on notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
