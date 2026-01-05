-- Office MLS Addresses and Phones Schema
-- Run: npx wrangler d1 execute wrap_sheet --file=office-mls-addresses.sql --remote -c wrangler-wrapsheet.toml

-- Addresses for office contacts
CREATE TABLE IF NOT EXISTS office_mls_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  office_contact_id INTEGER NOT NULL,
  address_id INTEGER,
  address_type TEXT,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (office_contact_id) REFERENCES office_mls_contacts(contact_id)
);

-- Phones for office contacts
CREATE TABLE IF NOT EXISTS office_mls_phones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  office_contact_id INTEGER NOT NULL,
  phone_id INTEGER,
  phone_type TEXT,
  number TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (office_contact_id) REFERENCES office_mls_contacts(contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_office_addresses_contact 
  ON office_mls_addresses(office_contact_id);

CREATE INDEX IF NOT EXISTS idx_office_phones_contact 
  ON office_mls_phones(office_contact_id);
