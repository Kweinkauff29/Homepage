-- LOGS Generator Submissions Table
-- Run this migration on the ber-logs-api D1 database

CREATE TABLE IF NOT EXISTS logs_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization TEXT,
  nrds_id TEXT,
  drop_memberships TEXT,      -- JSON array of strings
  drop_when TEXT,
  leaving_feedback TEXT,
  change_reasons TEXT,        -- JSON array of strings
  other_why TEXT,
  new_contact TEXT,
  new_broker_interested TEXT, -- Yes/No/I didn't ask/N/A
  needs_letter TEXT,          -- Yes/No
  cancel_supra TEXT,          -- Yes/No
  has_listings TEXT,          -- Yes/No
  member_matched INTEGER DEFAULT 0, -- 1 if matched to a member record
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_logs_requests_created_at ON logs_requests(created_at);
