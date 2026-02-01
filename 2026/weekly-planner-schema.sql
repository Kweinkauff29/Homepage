-- Flexible Weekly Planner Table
-- Stores cell values for any grid (Priorities, Marketing, etc.)
CREATE TABLE IF NOT EXISTS weekly_entries (
  week_start TEXT NOT NULL, -- YYYY-MM-DD of the Monday (or Sunday) start
  category TEXT NOT NULL,   -- 'priorities', 'marketing', 'projects', 'events'
  row_key TEXT NOT NULL,    -- '1', '2', 'Monday', 'ProjectA'
  col_key TEXT NOT NULL,    -- 'Kevin', 'FB_Post'
  value TEXT,               -- The content of the cell
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by_id INTEGER,
  PRIMARY KEY (week_start, category, row_key, col_key)
);
