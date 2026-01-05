-- WrapSheet Schema v8 - Board Ideas & Voting
-- Run these commands in Cloudflare D1

-- Suggestions table
CREATE TABLE IF NOT EXISTS pillar_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  pillar TEXT NOT NULL,         -- 'elevate', 'engage', 'evolve', 'excite'
  category TEXT NOT NULL,       -- 'Technology', 'Marketing', etc.
  assigned_to_id INTEGER,       -- Auto-mapped staff ID
  created_by_id INTEGER,        -- Submitter
  status TEXT DEFAULT 'suggested', -- 'suggested', 'active', 'completed'
  progress_notes TEXT,
  created_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

-- Voting table (5 votes per user per month enforcement in code)
CREATE TABLE IF NOT EXISTS task_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote_month TEXT NOT NULL,     -- 'YYYY-MM' to track monthly limit
  created_at TEXT,
  FOREIGN KEY (task_id) REFERENCES pillar_suggestions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(task_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_pillar ON pillar_suggestions(pillar);
CREATE INDEX IF NOT EXISTS idx_suggestions_assigned ON pillar_suggestions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_month ON task_votes(user_id, vote_month);
CREATE INDEX IF NOT EXISTS idx_votes_task ON task_votes(task_id);
