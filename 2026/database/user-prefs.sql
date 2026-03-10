CREATE TABLE IF NOT EXISTS user_prefs (
  user_id INTEGER PRIMARY KEY,
  prefs_json TEXT, -- JSON blob for things like custom category names
  updated_at TEXT
);
