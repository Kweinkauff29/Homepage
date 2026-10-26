CREATE TABLE IF NOT EXISTS dbpr_coe (
    license_number TEXT PRIMARY KEY,
    license_number_raw TEXT NOT NULL,
    rank TEXT,
    person_name TEXT,
    license_expiration_date TEXT,
    verified_date TEXT,
    verified_course_number TEXT,
    verified_course_name TEXT,
    verified_credit_hours REAL,
    review_date TEXT,
    review_course_number TEXT,
    review_course_name TEXT,
    review_credit_hours REAL,
    source_last_modified TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dbpr_coe_staging (
    license_number TEXT PRIMARY KEY,
    license_number_raw TEXT NOT NULL,
    rank TEXT,
    person_name TEXT,
    license_expiration_date TEXT,
    verified_date TEXT,
    verified_course_number TEXT,
    verified_course_name TEXT,
    verified_credit_hours REAL,
    review_date TEXT,
    review_course_number TEXT,
    review_course_name TEXT,
    review_credit_hours REAL,
    source_last_modified TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingest_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    source_last_modified TEXT,
    source_length INTEGER,
    cursor INTEGER NOT NULL DEFAULT 0,
    carry TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'idle',
    started_at TEXT,
    completed_at TEXT,
    rows_processed INTEGER NOT NULL DEFAULT 0,
    verified_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

INSERT OR IGNORE INTO ingest_state (id) VALUES (1);

CREATE TABLE IF NOT EXISTS sync_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    license_number TEXT NOT NULL,
    existing_coe_date TEXT,
    dbpr_coe_date TEXT,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    upstream_status INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_audit_contact_created
ON sync_audit(contact_id, created_at DESC);
