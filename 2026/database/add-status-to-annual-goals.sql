-- Add status column to annual_goals if it's missing (which caused the error)
ALTER TABLE annual_goals ADD COLUMN status TEXT DEFAULT 'pending';
