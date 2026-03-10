-- Add color and priority columns to daily_tasks
ALTER TABLE daily_tasks ADD COLUMN color TEXT;
ALTER TABLE daily_tasks ADD COLUMN priority INTEGER DEFAULT 1;
