-- Annual Goals Table
CREATE TABLE IF NOT EXISTS annual_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL DEFAULT 2026,
  category TEXT NOT NULL, -- Pillar: Elevate, Engage, Evolve, Excite
  owner_id INTEGER,
  status TEXT DEFAULT 'pending', -- pending, done, archived
  progress_percent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Multi-assignees for Monthly Goals (Initiatives)
CREATE TABLE IF NOT EXISTS monthly_goal_assignees (
  goal_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (goal_id, user_id)
);
