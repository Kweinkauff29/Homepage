-- WrapSheet Fix Missing Columns & Tables
-- Use this to ensure all features work (Bird, Weekly Tasks)

-- 1. Ensure Weekly Tasks table exists (for 404s)
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  week_key TEXT NOT NULL,                 -- '2026-W07'
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

-- 2. Add missing bird columns to user_preferences if not exists
-- (SQLite doesn't support IF NOT EXISTS for ADD COLUMN nicely in one line, 
-- but running these is generally safe if they don't exist, will error if they do. 
-- In Cloudflare D1, it's best to run one by one or ignore error if exists)


