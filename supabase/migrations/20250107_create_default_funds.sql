-- Insert default funds if they don't exist
INSERT INTO funds (name, current_balance, description)
SELECT 'Management', 0.00, 'General management and operational expenses'
WHERE NOT EXISTS (SELECT 1 FROM funds WHERE name = 'Management');

INSERT INTO funds (name, current_balance, description)
SELECT 'Mission', 0.00, 'Mission activities and outreach programs'
WHERE NOT EXISTS (SELECT 1 FROM funds WHERE name = 'Mission');

INSERT INTO funds (name, current_balance, description)
SELECT 'Building', 0.00, 'Building maintenance and construction projects'
WHERE NOT EXISTS (SELECT 1 FROM funds WHERE name = 'Building');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON funds TO anon;
GRANT ALL PRIVILEGES ON funds TO authenticated;