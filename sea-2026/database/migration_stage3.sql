-- ====================================================================
-- 2026 Sales Excellence Awards - Stage 3 Additive Database Migration
-- Coconut Coast Organization of REALTORS® (CCOR)
-- ====================================================================

-- 1. Enhance sea_tokens for secure hash lookup and draft tracking
-- (SQLite supports ADD COLUMN safely)
ALTER TABLE sea_tokens ADD COLUMN token_hash TEXT;
ALTER TABLE sea_tokens ADD COLUMN last_accessed_at TEXT;
ALTER TABLE sea_tokens ADD COLUMN form_started INTEGER DEFAULT 0;
ALTER TABLE sea_tokens ADD COLUMN form_started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_sea_tokens_hash ON sea_tokens(token_hash);

-- 2. Server-side registration click tracking events table
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

CREATE INDEX IF NOT EXISTS idx_sea_reg_events_record ON sea_registration_events(record_id);

-- 3. Form drafts table for saving in-progress work
CREATE TABLE IF NOT EXISTS sea_form_drafts (
    record_id TEXT PRIMARY KEY REFERENCES sea_records(id) ON DELETE CASCADE,
    draft_award_preference TEXT,
    draft_engraved_name TEXT,
    draft_attendance_response TEXT,
    draft_self_reported INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Completed Form Responses (Idempotent authoritative submissions)
CREATE TABLE IF NOT EXISTS sea_form_responses (
    id TEXT PRIMARY KEY,                       -- e.g. 'RESP-2026-B3572194'
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

CREATE INDEX IF NOT EXISTS idx_sea_form_responses_rec ON sea_form_responses(record_id);

-- 5. Form revisions audit trail (Post-submission changes)
CREATE TABLE IF NOT EXISTS sea_form_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id TEXT NOT NULL REFERENCES sea_form_responses(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    revised_by TEXT NOT NULL,                  -- 'agent' | staff name
    revision_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. Self-reported contact corrections queue (Does not overwrite authoritative MLS records silently)
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
