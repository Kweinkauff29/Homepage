ALTER TABLE sea_records ADD COLUMN proof_numbers_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sea_records ADD COLUMN proof_numbers_confirmed_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_numbers_confirmed_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_event_registered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sea_records ADD COLUMN proof_event_registered_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_event_registered_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_not_attending INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sea_records ADD COLUMN proof_not_attending_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_not_attending_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_award_preference TEXT;
ALTER TABLE sea_records ADD COLUMN proof_award_preference_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_award_preference_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_confirmed_volume REAL;
ALTER TABLE sea_records ADD COLUMN proof_confirmed_volume_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_confirmed_volume_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_headshot_url TEXT;
ALTER TABLE sea_records ADD COLUMN proof_headshot_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_headshot_at TEXT;

ALTER TABLE sea_records ADD COLUMN proof_award_level TEXT;
ALTER TABLE sea_records ADD COLUMN proof_award_level_by TEXT;
ALTER TABLE sea_records ADD COLUMN proof_award_level_at TEXT;

ALTER TABLE sea_records ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sea_records ADD COLUMN archived_by TEXT;
ALTER TABLE sea_records ADD COLUMN archived_at TEXT;

ALTER TABLE sea_agents ADD COLUMN manual_city TEXT;
ALTER TABLE sea_agents ADD COLUMN manual_state TEXT;

CREATE INDEX IF NOT EXISTS idx_sea_records_archived ON sea_records(is_archived);
