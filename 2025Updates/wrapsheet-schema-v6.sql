-- WrapSheet Schema v6 - Joint Projects Feature
-- Run these commands in Cloudflare D1

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',        -- active, completed, archived
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (created_by_id) REFERENCES users(id)
);

-- Project steps (ordered, with assignees)
CREATE TABLE IF NOT EXISTS project_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assigned_to_id INTEGER,              -- Who's responsible for this step
  status TEXT DEFAULT 'pending',       -- pending, in_progress, done
  completed_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_steps_project ON project_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_project_steps_assigned ON project_steps(assigned_to_id);
