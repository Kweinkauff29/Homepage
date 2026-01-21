-- wrapsheet-schema-v12.sql
-- Add bird_name to user_preferences
ALTER TABLE user_preferences ADD COLUMN bird_name TEXT;
