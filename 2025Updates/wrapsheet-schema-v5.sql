-- WrapSheet Schema v5 - Goals Enhancement
-- Run these commands in Cloudflare D1 console or via wrangler d1 execute

-- Custom category names per user/period
CREATE TABLE IF NOT EXISTS goal_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- 'monthly' or 'annual'
  period_key TEXT NOT NULL,        -- '2025-01' for monthly, '2025' for annual
  original_name TEXT NOT NULL,     -- 'Personal', 'Professional', 'Team'
  custom_name TEXT,                -- User's custom label (null = use original)
  owner_id INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Subtasks for goals (both monthly and annual)
CREATE TABLE IF NOT EXISTS goal_subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_type TEXT NOT NULL,         -- 'monthly' or 'annual'
  goal_id INTEGER NOT NULL,        -- FK to monthly_goals or annual_goals
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',   -- pending, done
  weight INTEGER DEFAULT 1,        -- Contribution weight to progress %
  linked_task_id INTEGER,          -- FK to daily_tasks (when promoted to calendar)
  created_at TEXT,
  updated_at TEXT,
  completed_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_categories_lookup 
  ON goal_categories(type, period_key, owner_id);

CREATE INDEX IF NOT EXISTS idx_goal_subtasks_goal 
  ON goal_subtasks(goal_type, goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_subtasks_linked 
  ON goal_subtasks(linked_task_id);
