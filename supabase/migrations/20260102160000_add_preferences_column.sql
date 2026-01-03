-- Add preferences column to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
