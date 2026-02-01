-- Add unique constraint on offering_id in offering_member table
-- This enforces that an offering can only have one member associated with it
-- This also helps PostgREST infer a One-to-One relationship

ALTER TABLE public.offering_member
DROP CONSTRAINT IF EXISTS offering_member_offering_id_key;

ALTER TABLE public.offering_member
ADD CONSTRAINT offering_member_offering_id_key UNIQUE (offering_id);
