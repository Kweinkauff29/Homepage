-- ====================================================================
-- 2026 Sales Excellence Awards (SEA) Management System
-- Multi-Year Cloudflare D1 & SQLite Compatible Database Schema
-- Coconut Coast Organization of REALTORS® (CCOR)
-- ====================================================================

-- 1. Core Permanent Agent Profiles (Durable across all award years)
CREATE TABLE IF NOT EXISTS sea_agents (
    id TEXT PRIMARY KEY,                       -- Internal UUID or permanent ID (e.g., 'SEA-AGT-0001')
    license_id TEXT UNIQUE,                    -- Real Estate License / MLS Agent ID (e.g., 'B3572194', '706269')
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    primary_email TEXT,
    primary_phone TEXT,
    primary_office TEXT,                       -- Primary brokerage office code / name
    is_active INTEGER DEFAULT 1,               -- 1 = Active, 0 = Inactive
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sea_agents_license ON sea_agents(license_id);
CREATE INDEX IF NOT EXISTS idx_sea_agents_name ON sea_agents(full_name);
CREATE INDEX IF NOT EXISTS idx_sea_agents_office ON sea_agents(primary_office);

-- 2. Award Years & Event Configuration (Configurable metadata per year)
CREATE TABLE IF NOT EXISTS sea_award_years (
    award_year INTEGER PRIMARY KEY,            -- e.g., 2026
    event_name TEXT NOT NULL,                  -- e.g., '2027 Sales Excellence Awards'
    event_date TEXT NOT NULL,                  -- e.g., 'February 11, 2027'
    event_time TEXT NOT NULL,                  -- e.g., '9:00 AM–11:30 AM Eastern'
    registration_url TEXT NOT NULL,            -- Official GrowthZone registration URL
    min_volume_threshold REAL DEFAULT 5000000.0, -- Total volume benchmark ($5M)
    min_sides_threshold REAL DEFAULT 25.0,     -- Total sides benchmark (25 sides)
    is_active INTEGER DEFAULT 1,
    email_mode TEXT DEFAULT 'disabled',        -- 'disabled' | 'test' | 'live' (Default strictly 'disabled')
    mandatory_bcc_email TEXT DEFAULT 'tech@coconutcoastrealtors.org',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Annual SEA Records (One record per agent per award year)
CREATE TABLE IF NOT EXISTS sea_records (
    id TEXT PRIMARY KEY,                       -- e.g., 'REC-2026-0001'
    agent_id TEXT NOT NULL REFERENCES sea_agents(id) ON DELETE RESTRICT,
    award_year INTEGER NOT NULL REFERENCES sea_award_years(award_year) ON DELETE RESTRICT,
    office TEXT,                               -- Office code for this award production year
    
    -- Transaction sides (Preserving 0.5 fractional increments)
    total_sides REAL NOT NULL DEFAULT 0.0,
    list_sides REAL DEFAULT 0.0,
    sold_sides REAL DEFAULT 0.0,
    
    -- Transaction volume (in whole dollars)
    total_volume REAL NOT NULL DEFAULT 0.0,
    list_volume REAL DEFAULT 0.0,
    sold_volume REAL DEFAULT 0.0,
    
    -- Report ranking and projections
    sides_rank INTEGER,
    volume_rank INTEGER,
    projected_2026_sides REAL,
    projected_2026_volume REAL,
    sides_needed REAL DEFAULT 0.0,
    volume_needed REAL DEFAULT 0.0,
    year_end_pace TEXT,                        -- 'Yes' | 'No'
    in_report TEXT,                            -- 'Both reports' | 'Sides top 200' | 'Volume top 200'
    workbook_category TEXT,                    -- Original category from source workbook
    
    -- Preliminary & Final Eligibility Classifications
    eligibility_category TEXT NOT NULL,        -- 'Qualified — Preliminary' | 'Verified Eligible' | 'Potential — High Priority' | 'Potential — Watch List' | 'Needs Manual Review' | 'Not Eligible'
    is_override INTEGER DEFAULT 0,             -- 1 if manual override applied
    override_reason TEXT,
    override_by TEXT,
    override_at TEXT,
    
    -- Award Preference (Exactly 2 physical options, no default)
    award_preference TEXT CHECK (award_preference IN ('certificate', 'trophy', NULL)),
    engraved_name TEXT,                        -- Exact name to engrave/print on award
    
    -- Attendance Response
    attendance_response TEXT CHECK (attendance_response IN ('yes', 'no', 'undecided', NULL)),
    
    -- Event Registration Truthfulness Tracking (Three independent facts)
    registration_link_clicked INTEGER DEFAULT 0, -- Fact A: Genuine click on registration link
    registration_link_clicked_at TEXT,
    registration_self_reported INTEGER DEFAULT 0, -- Fact B: Agent checked 'I confirm I completed registration'
    registration_self_reported_at TEXT,
    registration_independently_verified INTEGER DEFAULT 0, -- Fact C: GrowthZone integration / staff verification
    registration_independently_verified_by TEXT,
    registration_independently_verified_at TEXT,
    registration_verification_notes TEXT,
    
    -- Staff Follow-Up & Operations
    assigned_staff TEXT,
    contact_verified INTEGER DEFAULT 0,
    contact_verified_by TEXT,
    contact_verified_at TEXT,
    outreach_status TEXT DEFAULT 'Not contacted',
    internal_notes TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(agent_id, award_year)
);

CREATE INDEX IF NOT EXISTS idx_sea_records_year ON sea_records(award_year);
CREATE INDEX IF NOT EXISTS idx_sea_records_eligibility ON sea_records(eligibility_category);
CREATE INDEX IF NOT EXISTS idx_sea_records_agent ON sea_records(agent_id);

-- 4. Personalized Secure Confirmation Access Tokens (Stage 3 preparation)
CREATE TABLE IF NOT EXISTS sea_tokens (
    token TEXT PRIMARY KEY,                    -- Cryptographic UUIDv4
    record_id TEXT NOT NULL REFERENCES sea_records(id) ON DELETE CASCADE,
    expires_at TEXT,
    revoked_at TEXT,
    is_submitted INTEGER DEFAULT 0,
    submitted_at TEXT,
    form_version TEXT DEFAULT 'v1',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sea_tokens_record ON sea_tokens(record_id);

-- 5. Immutable Audit History for Staff Overrides and Eligibility Changes
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

CREATE INDEX IF NOT EXISTS idx_sea_audit_record ON sea_audit_log(record_id);

-- 6. Comprehensive Email Safety & Delivery Log (Audit trail)
CREATE TABLE IF NOT EXISTS sea_email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id TEXT REFERENCES sea_records(id),
    recipient_email TEXT NOT NULL,
    bcc_email TEXT NOT NULL,                   -- Enforces logging of mandatory tech@coconutcoastrealtors.org
    subject TEXT NOT NULL,
    email_type TEXT NOT NULL,                  -- 'invitation' | 'reminder_1' | 'reminder_2' | 'confirmation' | 'test'
    email_mode TEXT NOT NULL,                  -- 'disabled' | 'test' | 'live'
    delivery_status TEXT NOT NULL,             -- 'blocked_disabled' | 'blocked_unauthorized' | 'sent_test' | 'sent_live' | 'failed'
    response_payload TEXT,
    error_message TEXT,
    triggered_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
