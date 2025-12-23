-- Migration: Add church_id to petty_cash table for multi-church support
-- This ensures petty cash records are properly isolated by church

-- Step 1: Add church_id column (nullable initially to allow existing data)
ALTER TABLE petty_cash
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Step 2: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_petty_cash_church_id
ON petty_cash(church_id);

-- Step 3: Update existing records with a default church (if any exist)
DO $$
DECLARE
  default_church_id UUID;
BEGIN
  -- Get the first church_id to use as default for existing records
  SELECT id INTO default_church_id FROM churches LIMIT 1;

  -- Only update if we found a church and there are records without church_id
  IF default_church_id IS NOT NULL THEN
    UPDATE petty_cash
    SET church_id = default_church_id
    WHERE church_id IS NULL;
  END IF;
END $$;

-- Step 4: Make church_id NOT NULL after updating existing records
ALTER TABLE petty_cash
ALTER COLUMN church_id SET NOT NULL;

-- Step 5: Enable RLS on petty_cash if not already enabled
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view petty cash for their churches" ON petty_cash;
DROP POLICY IF EXISTS "Users can insert petty cash for their churches" ON petty_cash;
DROP POLICY IF EXISTS "Users can update petty cash for their churches" ON petty_cash;
DROP POLICY IF EXISTS "Users can delete petty cash for their churches" ON petty_cash;

-- Step 7: Create RLS policies for church isolation
CREATE POLICY "Users can view petty cash for their churches"
ON petty_cash
FOR SELECT
TO authenticated
USING (
  church_id IN (
    SELECT church_id
    FROM user_church_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

CREATE POLICY "Users can insert petty cash for their churches"
ON petty_cash
FOR INSERT
TO authenticated
WITH CHECK (
  church_id IN (
    SELECT church_id
    FROM user_church_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role_id IN (
      SELECT id FROM roles
      WHERE name IN ('admin', 'treasurer')
    )
  )
);

CREATE POLICY "Users can update petty cash for their churches"
ON petty_cash
FOR UPDATE
TO authenticated
USING (
  church_id IN (
    SELECT church_id
    FROM user_church_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role_id IN (
      SELECT id FROM roles
      WHERE name IN ('admin', 'treasurer')
    )
  )
)
WITH CHECK (
  church_id IN (
    SELECT church_id
    FROM user_church_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role_id IN (
      SELECT id FROM roles
      WHERE name IN ('admin', 'treasurer')
    )
  )
);

CREATE POLICY "Users can delete petty cash for their churches"
ON petty_cash
FOR DELETE
TO authenticated
USING (
  church_id IN (
    SELECT church_id
    FROM user_church_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role_id IN (
      SELECT id FROM roles
      WHERE name = 'admin'
    )
  )
);

-- Step 8: Add comment for documentation
COMMENT ON COLUMN petty_cash.church_id IS 'Foreign key to churches table for multi-church support';
