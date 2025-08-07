-- Create offering_members junction table
CREATE TABLE offering_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(offering_id, member_id)
);

-- Create indexes
CREATE INDEX idx_offering_members_offering_id ON offering_members(offering_id);
CREATE INDEX idx_offering_members_member_id ON offering_members(member_id);
CREATE INDEX idx_offering_members_created_at ON offering_members(created_at DESC);

-- RLS Policies
ALTER TABLE offering_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON offering_members TO anon;
GRANT ALL PRIVILEGES ON offering_members TO authenticated;

-- Remove contributors_count column from offerings table if it exists
ALTER TABLE offerings DROP COLUMN IF EXISTS contributors_count;