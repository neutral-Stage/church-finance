-- Create notifications table for real-time notifications system
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('offering', 'bill', 'transaction', 'advance', 'member', 'report', 'system')),
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_category ON notifications(category);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for any user" ON notifications
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;
GRANT INSERT ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Create function to generate notifications based on database events
CREATE OR REPLACE FUNCTION generate_bill_due_notifications()
RETURNS void AS $$
DECLARE
  bill_record RECORD;
  days_until_due INTEGER;
BEGIN
  -- Generate notifications for bills due within 7 days
  FOR bill_record IN 
    SELECT id, vendor_name, amount, due_date, status
    FROM bills 
    WHERE status IN ('pending', 'overdue')
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  LOOP
    days_until_due := (bill_record.due_date - CURRENT_DATE);
    
    -- Insert notification if it doesn't already exist
    INSERT INTO notifications (user_id, title, message, type, category, action_url, metadata)
    SELECT 
      auth.uid(),
      CASE 
        WHEN days_until_due = 0 THEN 'Bill Due Today'
        WHEN days_until_due = 1 THEN 'Bill Due Tomorrow'
        WHEN days_until_due < 0 THEN 'Overdue Bill'
        ELSE 'Bill Due Soon'
      END,
      CASE 
        WHEN days_until_due = 0 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due today'
        WHEN days_until_due = 1 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due tomorrow'
        WHEN days_until_due < 0 THEN bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is overdue by ' || ABS(days_until_due) || ' days'
        ELSE bill_record.vendor_name || ' bill ($' || bill_record.amount || ') is due in ' || days_until_due || ' days'
      END,
      CASE 
        WHEN days_until_due < 0 THEN 'error'
        WHEN days_until_due <= 1 THEN 'warning'
        ELSE 'info'
      END,
      'bill',
      '/bills?id=' || bill_record.id,
      jsonb_build_object('bill_id', bill_record.id, 'amount', bill_record.amount, 'due_date', bill_record.due_date)
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE category = 'bill' 
      AND metadata->>'bill_id' = bill_record.id::text
      AND created_at > CURRENT_DATE - INTERVAL '1 day'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate transaction notifications
CREATE OR REPLACE FUNCTION generate_transaction_notifications()
RETURNS void AS $$
DECLARE
  transaction_record RECORD;
BEGIN
  -- Generate notifications for large transactions (> $1000)
  FOR transaction_record IN 
    SELECT id, type, amount, description, transaction_date, created_at
    FROM transactions 
    WHERE amount > 1000
    AND created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Insert notification if it doesn't already exist
    INSERT INTO notifications (user_id, title, message, type, category, action_url, metadata)
    SELECT 
      auth.uid(),
      'Large Transaction Alert',
      'Large ' || transaction_record.type || ' transaction of $' || transaction_record.amount || ' recorded: ' || COALESCE(transaction_record.description, 'No description'),
      'warning',
      'transaction',
      '/transactions?id=' || transaction_record.id,
      jsonb_build_object('transaction_id', transaction_record.id, 'amount', transaction_record.amount, 'type', transaction_record.type)
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE category = 'transaction' 
      AND metadata->>'transaction_id' = transaction_record.id::text
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate offering notifications
CREATE OR REPLACE FUNCTION generate_offering_notifications()
RETURNS void AS $$
DECLARE
  offering_record RECORD;
BEGIN
  -- Generate notifications for new offerings
  FOR offering_record IN 
    SELECT id, type, amount, service_date, created_at
    FROM offerings 
    WHERE created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Insert notification if it doesn't already exist
    INSERT INTO notifications (user_id, title, message, type, category, action_url, metadata)
    SELECT 
      auth.uid(),
      'New Offering Received',
      offering_record.type || ' offering of $' || offering_record.amount || ' recorded for ' || offering_record.service_date,
      'success',
      'offering',
      '/offerings?id=' || offering_record.id,
      jsonb_build_object('offering_id', offering_record.id, 'amount', offering_record.amount, 'type', offering_record.type)
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE category = 'offering' 
      AND metadata->>'offering_id' = offering_record.id::text
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate advance notifications
CREATE OR REPLACE FUNCTION generate_advance_notifications()
RETURNS void AS $$
DECLARE
  advance_record RECORD;
  days_until_return INTEGER;
BEGIN
  -- Generate notifications for advances due for return
  FOR advance_record IN 
    SELECT id, recipient_name, amount, expected_return_date, status
    FROM advances 
    WHERE status = 'outstanding'
    AND expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  LOOP
    days_until_return := (advance_record.expected_return_date - CURRENT_DATE);
    
    -- Insert notification if it doesn't already exist
    INSERT INTO notifications (user_id, title, message, type, category, action_url, metadata)
    SELECT 
      auth.uid(),
      CASE 
        WHEN days_until_return = 0 THEN 'Advance Return Due Today'
        WHEN days_until_return = 1 THEN 'Advance Return Due Tomorrow'
        WHEN days_until_return < 0 THEN 'Overdue Advance Return'
        ELSE 'Advance Return Due Soon'
      END,
      CASE 
        WHEN days_until_return = 0 THEN advance_record.recipient_name || ' advance ($' || advance_record.amount || ') return is due today'
        WHEN days_until_return = 1 THEN advance_record.recipient_name || ' advance ($' || advance_record.amount || ') return is due tomorrow'
        WHEN days_until_return < 0 THEN advance_record.recipient_name || ' advance ($' || advance_record.amount || ') return is overdue by ' || ABS(days_until_return) || ' days'
        ELSE advance_record.recipient_name || ' advance ($' || advance_record.amount || ') return is due in ' || days_until_return || ' days'
      END,
      CASE 
        WHEN days_until_return < 0 THEN 'error'
        WHEN days_until_return <= 1 THEN 'warning'
        ELSE 'info'
      END,
      'advance',
      '/advances?id=' || advance_record.id,
      jsonb_build_object('advance_id', advance_record.id, 'amount', advance_record.amount, 'expected_return_date', advance_record.expected_return_date)
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE category = 'advance' 
      AND metadata->>'advance_id' = advance_record.id::text
      AND created_at > CURRENT_DATE - INTERVAL '1 day'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;