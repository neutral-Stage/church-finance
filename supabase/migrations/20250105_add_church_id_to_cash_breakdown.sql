-- Migration: Add church_id to cash_breakdown table for multi-church support
-- This ensures cash breakdown records are properly isolated by church

-- Step 1: Add church_id column (nullable initially to allow existing data)
ALTER TABLE cash_breakdown
ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- Step 2: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_cash_breakdown_church_id
ON cash_breakdown(church_id);

-- Step 3: Update existing records with a default church (if any exist)
-- This assumes you have at least one church in the system
-- If you have existing data, you may need to manually assign the correct church_id
DO $$
DECLARE
  default_church_id UUID;
BEGIN
  -- Get the first church_id to use as default for existing records
  SELECT id INTO default_church_id FROM churches LIMIT 1;

  -- Only update if we found a church and there are records without church_id
  IF default_church_id IS NOT NULL THEN
    UPDATE cash_breakdown
    SET church_id = default_church_id
    WHERE church_id IS NULL;
  END IF;
END $$;

-- Step 4: Make church_id NOT NULL after updating existing records
ALTER TABLE cash_breakdown
ALTER COLUMN church_id SET NOT NULL;

-- Step 5: Enable RLS on cash_breakdown if not already enabled
ALTER TABLE cash_breakdown ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view cash breakdown for their churches" ON cash_breakdown;
DROP POLICY IF EXISTS "Users can insert cash breakdown for their churches" ON cash_breakdown;
DROP POLICY IF EXISTS "Users can update cash breakdown for their churches" ON cash_breakdown;
DROP POLICY IF EXISTS "Users can delete cash breakdown for their churches" ON cash_breakdown;

-- Step 7: Create RLS policies for church isolation
CREATE POLICY "Users can view cash breakdown for their churches"
ON cash_breakdown
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

CREATE POLICY "Users can insert cash breakdown for their churches"
ON cash_breakdown
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

CREATE POLICY "Users can update cash breakdown for their churches"
ON cash_breakdown
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

CREATE POLICY "Users can delete cash breakdown for their churches"
ON cash_breakdown
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
COMMENT ON COLUMN cash_breakdown.church_id IS 'Foreign key to churches table for multi-church support';
