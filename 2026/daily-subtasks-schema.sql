-- Add daily_task_subtasks if missing
CREATE TABLE IF NOT EXISTS daily_task_subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  due_date TEXT,
  assigned_to_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE
);

-- Add daily_task_assignees if missing
CREATE TABLE IF NOT EXISTS daily_task_assignees (
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE
);
