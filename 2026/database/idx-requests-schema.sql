-- IDX & Broker Back Office Feed Request Submissions Table
-- Run this migration on the ber-logs-api D1 database

CREATE TABLE IF NOT EXISTS idx_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  bridge_email TEXT,
  feed_type TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  agent_names TEXT,
  brokerage_name TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  display_type TEXT NOT NULL,
  report_contact TEXT NOT NULL,
  intended_use TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for date-based querying and auditing
CREATE INDEX IF NOT EXISTS idx_idx_requests_created_at ON idx_requests(created_at);
