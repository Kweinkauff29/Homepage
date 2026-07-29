-- Cloudflare D1 Database Schema for REALTOR® Agent Directory & SEO Indexing Engine
-- Run this migration on your Cloudflare D1 database (e.g. wrangler d1 execute WRAP_DB --file=./database/schema_agent_directory.sql)

CREATE TABLE IF NOT EXISTS agents_directory (
  contact_id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organization TEXT,
  headline TEXT,
  bio TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  photo_url TEXT,
  banner_url TEXT,
  specialties TEXT,      -- JSON array of strings
  languages TEXT,        -- JSON array of strings
  service_areas TEXT,    -- JSON array of strings
  highlights TEXT,       -- JSON array of strings
  listings_json TEXT,    -- JSON array of listing objects
  youtube_json TEXT,     -- JSON array of video objects
  gallery_json TEXT,     -- JSON array of image objects
  documents_json TEXT,   -- JSON array of document objects
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Optimization indexes for rapid filtering, routing, and sitemap generation
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents_directory(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents_directory(status);
CREATE INDEX IF NOT EXISTS idx_agents_city ON agents_directory(city);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents_directory(organization);
CREATE INDEX IF NOT EXISTS idx_agents_updated ON agents_directory(updated_at);
