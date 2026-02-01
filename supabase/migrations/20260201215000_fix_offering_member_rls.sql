-- Fix offering_member RLS policies to explicitly allow INSERT with proper WITH CHECK
-- The existing FOR ALL policy only has USING (for SELECT/UPDATE/DELETE) but needs WITH CHECK for INSERT

-- Drop existing policies (legacy names)
DROP POLICY IF EXISTS "Users can manage offering members" ON public.offering_member;
DROP POLICY IF EXISTS "Users can view offering members" ON public.offering_member;

-- Drop new policies if they exist (for idempotency)
DROP POLICY IF EXISTS "offering_member_select" ON public.offering_member;
DROP POLICY IF EXISTS "offering_member_insert" ON public.offering_member;
DROP POLICY IF EXISTS "offering_member_update" ON public.offering_member;
DROP POLICY IF EXISTS "offering_member_delete" ON public.offering_member;

-- Create SELECT policy
CREATE POLICY "offering_member_select" ON public.offering_member
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM offerings o 
      WHERE o.id = offering_member.offering_id 
      AND user_has_church_access(o.church_id)
    )
  );

-- Create INSERT policy with WITH CHECK (checks after insert)
CREATE POLICY "offering_member_insert" ON public.offering_member
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM offerings o 
      WHERE o.id = offering_id 
      AND user_has_church_access(o.church_id)
    )
  );

-- Create UPDATE policy
CREATE POLICY "offering_member_update" ON public.offering_member
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM offerings o 
      WHERE o.id = offering_member.offering_id 
      AND user_has_church_access(o.church_id)
    )
  );

-- Create DELETE policy
CREATE POLICY "offering_member_delete" ON public.offering_member
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM offerings o 
      WHERE o.id = offering_member.offering_id 
      AND user_has_church_access(o.church_id)
    )
  );
