PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sea_agents (
  id TEXT PRIMARY KEY,
  license_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  primary_email TEXT,
  primary_phone TEXT,
  primary_office TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_test INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sea_award_years (
  award_year INTEGER PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  registration_url TEXT NOT NULL,
  min_volume_threshold REAL DEFAULT 5000000.0,
  min_sides_threshold REAL DEFAULT 25.0,
  is_active INTEGER DEFAULT 1,
  email_mode TEXT DEFAULT 'disabled',
  mandatory_bcc_email TEXT DEFAULT 'tech@coconutcoastrealtors.org',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_records (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES sea_agents(id) ON DELETE RESTRICT,
  award_year INTEGER NOT NULL REFERENCES sea_award_years(award_year) ON DELETE RESTRICT,
  office TEXT,
  total_sides REAL NOT NULL DEFAULT 0.0,
  list_sides REAL DEFAULT 0.0,
  sold_sides REAL DEFAULT 0.0,
  total_volume REAL NOT NULL DEFAULT 0.0,
  list_volume REAL DEFAULT 0.0,
  sold_volume REAL DEFAULT 0.0,
  sides_rank INTEGER,
  volume_rank INTEGER,
  projected_2026_sides REAL,
  projected_2026_volume REAL,
  sides_needed REAL DEFAULT 0.0,
  volume_needed REAL DEFAULT 0.0,
  year_end_pace TEXT,
  in_report TEXT,
  workbook_category TEXT,
  eligibility_category TEXT NOT NULL,
  is_override INTEGER DEFAULT 0,
  override_reason TEXT,
  override_by TEXT,
  override_at TEXT,
  award_preference TEXT CHECK (award_preference IN ('certificate', 'trophy') OR award_preference IS NULL),
  engraved_name TEXT,
  attendance_response TEXT CHECK (attendance_response IN ('yes', 'no', 'undecided') OR attendance_response IS NULL),
  registration_link_clicked INTEGER DEFAULT 0,
  registration_link_clicked_at TEXT,
  registration_self_reported INTEGER DEFAULT 0,
  registration_self_reported_at TEXT,
  registration_independently_verified INTEGER DEFAULT 0,
  registration_independently_verified_by TEXT,
  registration_independently_verified_at TEXT,
  registration_verification_notes TEXT,
  assigned_staff TEXT,
  contact_verified INTEGER DEFAULT 0,
  contact_verified_by TEXT,
  contact_verified_at TEXT,
  outreach_status TEXT DEFAULT 'Not contacted',
  internal_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_test INTEGER DEFAULT 0,
  UNIQUE(agent_id, award_year)
);

CREATE TABLE IF NOT EXISTS sea_tokens (
  token TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES sea_records(id) ON DELETE CASCADE,
  expires_at TEXT,
  revoked_at TEXT,
  is_submitted INTEGER DEFAULT 0,
  submitted_at TEXT,
  form_version TEXT DEFAULT 'v1',
  created_at TEXT DEFAULT (datetime('now')),
  token_hash TEXT,
  last_accessed_at TEXT,
  form_started INTEGER DEFAULT 0,
  form_started_at TEXT
);

CREATE TABLE IF NOT EXISTS sea_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL REFERENCES sea_records(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT REFERENCES sea_records(id),
  recipient_email TEXT NOT NULL,
  bcc_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  email_mode TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  response_payload TEXT,
  error_message TEXT,
  triggered_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_registration_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL REFERENCES sea_records(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES sea_agents(id) ON DELETE CASCADE,
  award_year INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  clicked_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS sea_form_drafts (
  record_id TEXT PRIMARY KEY REFERENCES sea_records(id) ON DELETE CASCADE,
  draft_award_preference TEXT,
  draft_engraved_name TEXT,
  draft_attendance_response TEXT,
  draft_self_reported INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_form_responses (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE REFERENCES sea_records(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES sea_agents(id) ON DELETE CASCADE,
  award_year INTEGER NOT NULL,
  award_preference TEXT NOT NULL CHECK (award_preference IN ('certificate', 'trophy')),
  engraved_name TEXT NOT NULL,
  attendance_response TEXT NOT NULL CHECK (attendance_response IN ('yes', 'no', 'undecided')),
  registration_self_reported INTEGER NOT NULL DEFAULT 0,
  registration_link_clicked INTEGER NOT NULL DEFAULT 1,
  registration_link_clicked_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sea_form_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id TEXT NOT NULL REFERENCES sea_form_responses(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  revised_by TEXT NOT NULL,
  revision_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_contact_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL REFERENCES sea_records(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES sea_agents(id) ON DELETE CASCADE,
  requested_name TEXT,
  requested_email TEXT,
  requested_phone TEXT,
  requested_office TEXT,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_office_mappings (
  office_code TEXT PRIMARY KEY,
  brokerage_name TEXT NOT NULL,
  is_verified INTEGER DEFAULT 1,
  notes TEXT,
  updated_by TEXT DEFAULT 'system',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sea_agents_license ON sea_agents(license_id);
CREATE INDEX IF NOT EXISTS idx_sea_agents_name ON sea_agents(full_name);
CREATE INDEX IF NOT EXISTS idx_sea_agents_office ON sea_agents(primary_office);
CREATE INDEX IF NOT EXISTS idx_sea_agents_is_test ON sea_agents(is_test);
CREATE INDEX IF NOT EXISTS idx_sea_records_year ON sea_records(award_year);
CREATE INDEX IF NOT EXISTS idx_sea_records_eligibility ON sea_records(eligibility_category);
CREATE INDEX IF NOT EXISTS idx_sea_records_agent ON sea_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_sea_records_is_test ON sea_records(is_test);
CREATE INDEX IF NOT EXISTS idx_sea_tokens_record ON sea_tokens(record_id);
CREATE INDEX IF NOT EXISTS idx_sea_tokens_hash ON sea_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_sea_audit_record ON sea_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_sea_reg_events_record ON sea_registration_events(record_id);
CREATE INDEX IF NOT EXISTS idx_sea_form_responses_rec ON sea_form_responses(record_id);

