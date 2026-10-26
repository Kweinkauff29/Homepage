-- ====================================================================
-- Stage 4 Database Migration: Data Activation, Isolation & Office Mappings
-- ====================================================================

-- 1. Add is_test flag to sea_agents and sea_records
ALTER TABLE sea_agents ADD COLUMN is_test INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sea_agents_is_test ON sea_agents(is_test);

ALTER TABLE sea_records ADD COLUMN is_test INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sea_records_is_test ON sea_records(is_test);

-- 2. Mark the 3 fictional test agents
UPDATE sea_agents SET is_test = 1 WHERE id LIKE 'SEA-AGT-TEST%';
UPDATE sea_records SET is_test = 1 WHERE agent_id LIKE 'SEA-AGT-TEST%';
UPDATE sea_agents SET is_test = 0 WHERE id NOT LIKE 'SEA-AGT-TEST%';
UPDATE sea_records SET is_test = 0 WHERE agent_id NOT LIKE 'SEA-AGT-TEST%';

-- 3. Office Code to Human-Readable Brokerage Mapping Table
CREATE TABLE IF NOT EXISTS sea_office_mappings (
    office_code TEXT PRIMARY KEY,
    brokerage_name TEXT NOT NULL,
    is_verified INTEGER DEFAULT 1,
    notes TEXT,
    updated_by TEXT DEFAULT 'system',
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Historical Award Years Preservation
INSERT OR IGNORE INTO sea_award_years (
    award_year, event_name, event_date, event_time, registration_url,
    min_volume_threshold, min_sides_threshold, is_active, email_mode, mandatory_bcc_email
) VALUES (
    2025, '2025 Sales Excellence Awards', 'February 2025', 'Completed',
    'https://coconutcoastrealtors.org/2025-sales-excellence-award-winners/',
    5000000.0, 25.0, 0, 'disabled', 'tech@coconutcoastrealtors.org'
);

INSERT OR IGNORE INTO sea_award_years (
    award_year, event_name, event_date, event_time, registration_url,
    min_volume_threshold, min_sides_threshold, is_active, email_mode, mandatory_bcc_email
) VALUES (
    2024, '2024 Sales Excellence Awards', 'February 2024', 'Completed',
    'https://coconutcoastrealtors.org/2024-sales-excellence-award-winners/',
    5000000.0, 25.0, 0, 'disabled', 'tech@coconutcoastrealtors.org'
);
