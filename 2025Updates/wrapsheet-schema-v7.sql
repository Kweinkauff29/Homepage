-- WrapSheet Schema v7 - User Preferences & Weekly Tasks
-- Run these commands in Cloudflare D1

-- User preferences table for storing theme, view, and section order
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  theme TEXT DEFAULT 'light',             -- 'light' or 'dark'
  calendar_view TEXT DEFAULT 'month',     -- 'month', 'week', 'workWeek'
  section_order TEXT DEFAULT NULL,        -- JSON array: ["daily-tasks","monthly-goals",...]
  enable_weekly_tasks INTEGER DEFAULT 0,  -- 1 = show weekly tasks (BETA)
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Weekly tasks table (BETA: currently for Jenna)
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  week_key TEXT NOT NULL,                 -- '2025-W52' format
  assigned_to_id INTEGER NOT NULL,
  assigned_by_id INTEGER,
  status TEXT DEFAULT 'pending',          -- 'pending', 'in_progress', 'done'
  priority INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week ON weekly_tasks(week_key);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_assigned ON weekly_tasks(assigned_to_id);
