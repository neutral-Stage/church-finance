-- Create members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    fellowship_name VARCHAR(100),
    job VARCHAR(100),
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_members_fellowship ON members(fellowship_name);
CREATE INDEX idx_members_created_at ON members(created_at DESC);

-- RLS Policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON members TO anon;
GRANT ALL PRIVILEGES ON members TO authenticated;

-- Insert some sample members for testing
INSERT INTO members (name, phone, fellowship_name, job, location) VALUES
('John Smith', '+8801712345678', 'Dhaka Fellowship', 'Teacher', 'Dhanmondi, Dhaka'),
('Mary Johnson', '+8801823456789', 'Chittagong Church', 'Nurse', 'Agrabad, Chittagong'),
('David Wilson', '+8801934567890', 'Sylhet Assembly', 'Engineer', 'Zindabazar, Sylhet'),
('Sarah Brown', '+8801645678901', 'Dhaka Fellowship', 'Doctor', 'Gulshan, Dhaka'),
('Michael Davis', '+8801756789012', 'Rajshahi Church', 'Business Owner', 'Shaheb Bazar, Rajshahi');