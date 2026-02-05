-- Refactor cash_breakdown table to match frontend normalized structure and add church_id support

-- Drop existing table (data loss acceptable as verified empty/unused)
DROP TABLE IF EXISTS public.cash_breakdown;

-- Create new table with normalized structure
CREATE TABLE public.cash_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    fund_type TEXT NOT NULL,
    denomination INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT cash_breakdown_church_fund_denom_key UNIQUE (church_id, fund_type, denomination)
);

-- Enable RLS
ALTER TABLE public.cash_breakdown ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view cash breakdown" ON public.cash_breakdown
    FOR SELECT USING (user_has_church_access(church_id));

CREATE POLICY "Users can manage cash breakdown" ON public.cash_breakdown
    FOR ALL USING (user_has_church_access(church_id));

-- Grant permissions if necessary (usually public role needs access for authenticated users via RLS)
GRANT ALL ON TABLE public.cash_breakdown TO authenticated;
GRANT ALL ON TABLE public.cash_breakdown TO service_role;
