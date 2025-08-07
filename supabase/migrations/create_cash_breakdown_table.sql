-- Create cash_breakdown table for tracking cash denominations by fund
CREATE TABLE cash_breakdown (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_type VARCHAR(50) NOT NULL CHECK (fund_type IN ('Mission Fund', 'Management Fund', 'Building Fund')),
  denomination INTEGER NOT NULL CHECK (denomination IN (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1)),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (denomination * count) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fund_type, denomination)
);

-- Enable RLS
ALTER TABLE cash_breakdown ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users" ON cash_breakdown
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL PRIVILEGES ON cash_breakdown TO authenticated;
GRANT SELECT ON cash_breakdown TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_cash_breakdown_updated_at
    BEFORE UPDATE ON cash_breakdown
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data for all fund types and denominations with 0 count
INSERT INTO cash_breakdown (fund_type, denomination, count) VALUES
  -- Mission Fund
  ('Mission Fund', 1000, 0),
  ('Mission Fund', 500, 0),
  ('Mission Fund', 200, 0),
  ('Mission Fund', 100, 0),
  ('Mission Fund', 50, 0),
  ('Mission Fund', 20, 0),
  ('Mission Fund', 10, 0),
  ('Mission Fund', 5, 0),
  ('Mission Fund', 2, 0),
  ('Mission Fund', 1, 0),
  -- Management Fund
  ('Management Fund', 1000, 0),
  ('Management Fund', 500, 0),
  ('Management Fund', 200, 0),
  ('Management Fund', 100, 0),
  ('Management Fund', 50, 0),
  ('Management Fund', 20, 0),
  ('Management Fund', 10, 0),
  ('Management Fund', 5, 0),
  ('Management Fund', 2, 0),
  ('Management Fund', 1, 0),
  -- Building Fund
  ('Building Fund', 1000, 0),
  ('Building Fund', 500, 0),
  ('Building Fund', 200, 0),
  ('Building Fund', 100, 0),
  ('Building Fund', 50, 0),
  ('Building Fund', 20, 0),
  ('Building Fund', 10, 0),
  ('Building Fund', 5, 0),
  ('Building Fund', 2, 0),
  ('Building Fund', 1, 0);