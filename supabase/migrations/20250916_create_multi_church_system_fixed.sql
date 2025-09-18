-- Multi-Church/Fellowship Management System Migration (Fixed)
-- This migration creates the foundation for managing multiple churches/fellowships/ministries
-- with role-based access control and fund management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create churches table (main organization table)
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('church', 'fellowship', 'ministry')) DEFAULT 'church',
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    established_date DATE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for churches
CREATE INDEX IF NOT EXISTS idx_churches_name ON churches(name);
CREATE INDEX IF NOT EXISTS idx_churches_type ON churches(type);
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches(is_active);

-- Create roles table (enhanced role management)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- Create user_church_roles table (many-to-many relationship for user access to churches)
CREATE TABLE IF NOT EXISTS user_church_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, church_id, role_id)
);

-- Create indexes for user_church_roles
CREATE INDEX IF NOT EXISTS idx_user_church_roles_user ON user_church_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_church_roles_church ON user_church_roles(church_id);
CREATE INDEX IF NOT EXISTS idx_user_church_roles_role ON user_church_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_church_roles_active ON user_church_roles(is_active);

-- Handle the funds table modification carefully
-- First, drop the existing fund_summary view that depends on the funds.name column
DROP VIEW IF EXISTS fund_summary;

-- Now we can safely modify the funds table
-- Add new columns first
ALTER TABLE funds ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS fund_type VARCHAR(100);
ALTER TABLE funds ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove the old constraint on the name column
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_name_check;

-- Create index for funds church relationship
CREATE INDEX IF NOT EXISTS idx_funds_church ON funds(church_id);
CREATE INDEX IF NOT EXISTS idx_funds_active ON funds(is_active);

-- Insert default system roles
INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES 
('super_admin', 'Super Administrator', 'Full system access across all churches', 
 '{
    "churches": {"create": true, "read": true, "update": true, "delete": true},
    "users": {"create": true, "read": true, "update": true, "delete": true},
    "roles": {"create": true, "read": true, "update": true, "delete": true},
    "funds": {"create": true, "read": true, "update": true, "delete": true},
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "offerings": {"create": true, "read": true, "update": true, "delete": true},
    "bills": {"create": true, "read": true, "update": true, "delete": true},
    "advances": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"create": true, "read": true, "update": true, "delete": true}
 }', true),
('church_admin', 'Church Administrator', 'Full access to assigned church operations', 
 '{
    "funds": {"create": true, "read": true, "update": true, "delete": true},
    "transactions": {"create": true, "read": true, "update": true, "delete": true},
    "offerings": {"create": true, "read": true, "update": true, "delete": true},
    "bills": {"create": true, "read": true, "update": true, "delete": true},
    "advances": {"create": true, "read": true, "update": true, "delete": true},
    "reports": {"create": true, "read": true, "update": true, "delete": false},
    "members": {"create": true, "read": true, "update": true, "delete": true}
 }', true),
('treasurer', 'Treasurer', 'Financial management for assigned churches', 
 '{
    "funds": {"create": false, "read": true, "update": true, "delete": false},
    "transactions": {"create": true, "read": true, "update": true, "delete": false},
    "offerings": {"create": true, "read": true, "update": true, "delete": false},
    "bills": {"create": true, "read": true, "update": true, "delete": false},
    "advances": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"create": false, "read": true, "update": false, "delete": false}
 }', true),
('finance_viewer', 'Finance Viewer', 'Read-only access to financial data', 
 '{
    "funds": {"create": false, "read": true, "update": false, "delete": false},
    "transactions": {"create": false, "read": true, "update": false, "delete": false},
    "offerings": {"create": false, "read": true, "update": false, "delete": false},
    "bills": {"create": false, "read": true, "update": false, "delete": false},
    "advances": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"create": false, "read": true, "update": false, "delete": false}
 }', true),
('member', 'Member', 'Basic member access', 
 '{
    "offerings": {"create": false, "read": true, "update": false, "delete": false}
 }', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Create a default church for existing data
INSERT INTO churches (name, type, description, is_active) 
VALUES ('Main Church', 'church', 'Default church for existing data', true)
ON CONFLICT DO NOTHING;

-- Get the default church ID and update existing funds
DO $$
DECLARE
    default_church_id UUID;
BEGIN
    SELECT id INTO default_church_id FROM churches WHERE name = 'Main Church' LIMIT 1;
    
    -- Update existing funds to belong to the default church
    UPDATE funds SET church_id = default_church_id WHERE church_id IS NULL;
END $$;

-- Create updated_at trigger function for churches
CREATE OR REPLACE FUNCTION update_churches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for churches
DROP TRIGGER IF EXISTS trigger_update_churches_updated_at ON churches;
CREATE TRIGGER trigger_update_churches_updated_at
    BEFORE UPDATE ON churches
    FOR EACH ROW EXECUTE FUNCTION update_churches_updated_at();

-- Create updated_at trigger function for funds
CREATE OR REPLACE FUNCTION update_funds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for funds
DROP TRIGGER IF EXISTS trigger_update_funds_updated_at ON funds;
CREATE TRIGGER trigger_update_funds_updated_at
    BEFORE UPDATE ON funds
    FOR EACH ROW EXECUTE FUNCTION update_funds_updated_at();

-- Create updated_at trigger function for user_church_roles
CREATE OR REPLACE FUNCTION update_user_church_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for user_church_roles
DROP TRIGGER IF EXISTS trigger_update_user_church_roles_updated_at ON user_church_roles;
CREATE TRIGGER trigger_update_user_church_roles_updated_at
    BEFORE UPDATE ON user_church_roles
    FOR EACH ROW EXECUTE FUNCTION update_user_church_roles_updated_at();

-- Create updated_at trigger function for roles
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for roles
DROP TRIGGER IF EXISTS trigger_update_roles_updated_at ON roles;
CREATE TRIGGER trigger_update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_roles_updated_at();

-- Enable Row Level Security on new tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_church_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for churches
DROP POLICY IF EXISTS "Users can view churches they have access to" ON churches;
CREATE POLICY "Users can view churches they have access to" ON churches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr 
            WHERE ucr.church_id = churches.id 
            AND ucr.user_id = auth.uid() 
            AND ucr.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

DROP POLICY IF EXISTS "Super admins can insert churches" ON churches;
CREATE POLICY "Super admins can insert churches" ON churches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

DROP POLICY IF EXISTS "Church admins and super admins can update churches" ON churches;
CREATE POLICY "Church admins and super admins can update churches" ON churches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = churches.id
            AND ucr.user_id = auth.uid()
            AND r.name IN ('super_admin', 'church_admin')
            AND ucr.is_active = true
        )
    );

-- Create RLS policies for roles
DROP POLICY IF EXISTS "Users can view roles" ON roles;
CREATE POLICY "Users can view roles" ON roles
    FOR SELECT USING (true);

-- Create RLS policies for user_church_roles
DROP POLICY IF EXISTS "Users can view their own church roles" ON user_church_roles;
CREATE POLICY "Users can view their own church roles" ON user_church_roles
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = user_church_roles.church_id
            AND ucr.user_id = auth.uid()
            AND r.name IN ('super_admin', 'church_admin')
            AND ucr.is_active = true
        )
    );

DROP POLICY IF EXISTS "Admins can manage user church roles" ON user_church_roles;
CREATE POLICY "Admins can manage user church roles" ON user_church_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = user_church_roles.church_id
            AND ucr.user_id = auth.uid()
            AND r.name IN ('super_admin', 'church_admin')
            AND ucr.is_active = true
        )
    );

-- Update existing funds RLS policies to include church access
DROP POLICY IF EXISTS "Enable read access for all users" ON funds;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON funds;
DROP POLICY IF EXISTS "Users can view funds from their churches" ON funds;
DROP POLICY IF EXISTS "Users with permissions can manage funds" ON funds;

CREATE POLICY "Users can view funds from their churches" ON funds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr 
            WHERE ucr.church_id = funds.church_id 
            AND ucr.user_id = auth.uid() 
            AND ucr.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = auth.uid()
            AND r.name = 'super_admin'
            AND ucr.is_active = true
        )
    );

CREATE POLICY "Users with permissions can manage funds" ON funds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_church_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.church_id = funds.church_id
            AND ucr.user_id = auth.uid()
            AND ucr.is_active = true
            AND (
                r.permissions->'funds'->>'create' = 'true'
                OR r.permissions->'funds'->>'update' = 'true'
                OR r.permissions->'funds'->>'delete' = 'true'
            )
        )
    );

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON churches TO authenticated;
GRANT ALL PRIVILEGES ON roles TO authenticated;
GRANT ALL PRIVILEGES ON user_church_roles TO authenticated;

-- Update existing users with default church access
DO $$
DECLARE
    default_church_id UUID;
    admin_role_id UUID;
    treasurer_role_id UUID;
    viewer_role_id UUID;
    user_record RECORD;
BEGIN
    SELECT id INTO default_church_id FROM churches WHERE name = 'Main Church' LIMIT 1;
    SELECT id INTO admin_role_id FROM roles WHERE name = 'church_admin' LIMIT 1;
    SELECT id INTO treasurer_role_id FROM roles WHERE name = 'treasurer' LIMIT 1;
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'finance_viewer' LIMIT 1;
    
    -- Grant access to existing users based on their current role
    FOR user_record IN SELECT id, role FROM users LOOP
        IF user_record.role = 'admin' THEN
            INSERT INTO user_church_roles (user_id, church_id, role_id, granted_by, notes)
            VALUES (user_record.id, default_church_id, admin_role_id, user_record.id, 'Migrated from existing system')
            ON CONFLICT (user_id, church_id, role_id) DO NOTHING;
        ELSIF user_record.role = 'treasurer' THEN
            INSERT INTO user_church_roles (user_id, church_id, role_id, granted_by, notes)
            VALUES (user_record.id, default_church_id, treasurer_role_id, user_record.id, 'Migrated from existing system')
            ON CONFLICT (user_id, church_id, role_id) DO NOTHING;
        ELSIF user_record.role = 'viewer' THEN
            INSERT INTO user_church_roles (user_id, church_id, role_id, granted_by, notes)
            VALUES (user_record.id, default_church_id, viewer_role_id, user_record.id, 'Migrated from existing system')
            ON CONFLICT (user_id, church_id, role_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_church_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = p_user_id
        AND ucr.church_id = p_church_id
        AND ucr.is_active = true
        AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
        AND r.permissions->p_resource->>p_action = 'true'
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user churches
CREATE OR REPLACE FUNCTION get_user_churches(p_user_id UUID)
RETURNS TABLE (
    church_id UUID,
    church_name VARCHAR,
    church_type VARCHAR,
    role_name VARCHAR,
    role_display_name VARCHAR,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as church_id,
        c.name as church_name,
        c.type as church_type,
        r.name as role_name,
        r.display_name as role_display_name,
        r.permissions
    FROM churches c
    JOIN user_church_roles ucr ON c.id = ucr.church_id
    JOIN roles r ON ucr.role_id = r.id
    WHERE ucr.user_id = p_user_id
    AND ucr.is_active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
    AND c.is_active = true
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the fund_summary view with the updated funds table structure
CREATE OR REPLACE VIEW fund_summary AS
SELECT 
    f.id,
    f.name,
    f.current_balance,
    f.church_id,
    f.fund_type,
    f.is_active,
    COALESCE(income_total.total, 0) as total_income,
    COALESCE(expense_total.total, 0) as total_expenses,
    COALESCE(offering_total.total, 0) as total_offerings,
    f.created_at
FROM funds f
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'income'
    GROUP BY fund_id
) income_total ON f.id = income_total.fund_id
LEFT JOIN (
    SELECT fund_id, SUM(amount) as total
    FROM transactions 
    WHERE type = 'expense'
    GROUP BY fund_id
) expense_total ON f.id = expense_total.fund_id
LEFT JOIN (
    SELECT 
        f2.id as fund_id,
        SUM((o.fund_allocations->>f2.name)::numeric) as total
    FROM offerings o
    CROSS JOIN funds f2
    WHERE o.fund_allocations ? f2.name
    GROUP BY f2.id
) offering_total ON f.id = offering_total.fund_id
WHERE f.is_active = true;

-- Create view for user permissions summary
CREATE OR REPLACE VIEW user_permissions_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    c.id as church_id,
    c.name as church_name,
    c.type as church_type,
    r.name as role_name,
    r.display_name as role_display_name,
    r.permissions,
    ucr.granted_at,
    ucr.expires_at,
    ucr.is_active
FROM users u
JOIN user_church_roles ucr ON u.id = ucr.user_id
JOIN churches c ON ucr.church_id = c.id
JOIN roles r ON ucr.role_id = r.id
WHERE ucr.is_active = true
AND c.is_active = true;

-- Grant access to the views
GRANT SELECT ON fund_summary TO anon;
GRANT SELECT ON fund_summary TO authenticated;
GRANT SELECT ON user_permissions_summary TO authenticated;