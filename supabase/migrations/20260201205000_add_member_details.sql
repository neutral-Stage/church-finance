
-- Add missing columns to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS job VARCHAR(100),
ADD COLUMN IF NOT EXISTS fellowship_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255);
