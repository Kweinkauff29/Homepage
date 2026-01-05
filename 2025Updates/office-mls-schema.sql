-- Office MLS Contacts Schema
-- Run: npx wrangler d1 execute wrap_sheet --file=office-mls-schema.sql --remote -c wrangler-wrapsheet.toml

CREATE TABLE IF NOT EXISTS office_mls_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER UNIQUE NOT NULL,    -- GrowthZone ContactId
  name TEXT NOT NULL,                     -- Office/Contact name
  nrds_id TEXT,                           -- NRDSMemberId
  mls_id TEXT,                            -- MLSId
  mls_office_id TEXT,                     -- MLSOfficeId
  address_line1 TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  member_status TEXT,                     -- Active, Dropped, etc.
  membership_start_date TEXT,
  membership_expiration_date TEXT,
  last_synced_at TEXT,                    -- When data was last pulled from GZ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_office_mls_member_status 
  ON office_mls_contacts(member_status);

CREATE INDEX IF NOT EXISTS idx_office_mls_contact_id 
  ON office_mls_contacts(contact_id);
