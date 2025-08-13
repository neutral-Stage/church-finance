-- Add unique constraint to ensure each offering can only have one member
ALTER TABLE offering_member 
ADD CONSTRAINT unique_offering_member 
UNIQUE (offering_id);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_offering_member ON offering_member 
IS 'Ensures each offering can only have one associated member';