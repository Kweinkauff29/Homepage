-- Add task_time column for scheduled time reminders
ALTER TABLE daily_tasks ADD COLUMN task_time TEXT;
-- Format: "HH:MM" (24-hour), e.g. "09:30", "14:00"
-- NULL means no specific time scheduled
