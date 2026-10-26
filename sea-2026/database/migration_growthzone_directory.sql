PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sea_growthzone_contacts (
  agent_id TEXT PRIMARY KEY REFERENCES sea_agents(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL UNIQUE,
  source_first_name TEXT,
  source_last_name TEXT,
  source_display_name TEXT,
  source_email TEXT NOT NULL,
  source_phone TEXT NOT NULL,
  business_mobile_phone TEXT,
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  membership_status TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('Exact', 'Probable')),
  source_last_updated_date TEXT,
  source_exported_at TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sea_growthzone_offices (
  office_code TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  main_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  membership_status TEXT,
  source_last_updated_date TEXT,
  sea_agent_count INTEGER NOT NULL DEFAULT 0,
  source_exported_at TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gz_contacts_org ON sea_growthzone_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_gz_contacts_status ON sea_growthzone_contacts(membership_status);
CREATE INDEX IF NOT EXISTS idx_gz_contacts_match ON sea_growthzone_contacts(match_status);
CREATE INDEX IF NOT EXISTS idx_gz_offices_org ON sea_growthzone_offices(organization_id);

