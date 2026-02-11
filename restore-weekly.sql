-- Restore Weekly Data for Week of Feb 9th, 2026 (Fixing 2/8 data loss)
-- Source: User Screenshot

-- Ensure table exists (idempotent)
CREATE TABLE IF NOT EXISTS weekly_entries (
  week_start TEXT NOT NULL,
  category TEXT NOT NULL,
  row_key TEXT NOT NULL,
  col_key TEXT NOT NULL,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by_id INTEGER,
  PRIMARY KEY (week_start, category, row_key, col_key)
);

-- Insert Priorities
INSERT OR REPLACE INTO weekly_entries (week_start, category, row_key, col_key, value) VALUES
('2026-02-09', 'priorities', '1', 'Erica', 'SEA report to Trophy Center'),
('2026-02-09', 'priorities', '1', 'Katie', 'SEA Logistics - food, setup, etc'),
('2026-02-09', 'priorities', '1', 'Kevin', 'Leadership Academy'),
('2026-02-09', 'priorities', '1', 'Jenna', 'Member recognition'),
('2026-02-09', 'priorities', '1', 'Meighan', 'New hire onboarding'),
('2026-02-09', 'priorities', '2', 'Erica', 'Testing listing manager'),
('2026-02-09', 'priorities', '2', 'Katie', 'Membership Breakfast'),
('2026-02-09', 'priorities', '2', 'Kevin', 'Market stats videos/posts'),
('2026-02-09', 'priorities', '2', 'Jenna', 'Member apps / David Reports'),
('2026-02-09', 'priorities', '2', 'Meighan', 'BOD report prep'),
('2026-02-09', 'priorities', '3', 'Erica', 'LDC'),
('2026-02-09', 'priorities', '3', 'Katie', '2 Classes'),
('2026-02-09', 'priorities', '3', 'Kevin', 'Magazine'),
('2026-02-09', 'priorities', '3', 'Jenna', 'Melodie learning guides'),
('2026-02-09', 'priorities', '4', 'Erica', 'MLS Rules update'),
('2026-02-09', 'priorities', '4', 'Katie', 'Education benchmark'),
('2026-02-09', 'priorities', '4', 'Kevin', 'Blasts'),
('2026-02-09', 'priorities', '4', 'Jenna', 'BOD Signs'),
('2026-02-09', 'priorities', '5', 'Erica', 'Listing transfers/ MLS committee'),
('2026-02-09', 'priorities', '5', 'Katie', 'Class renewals/ Que form'),
('2026-02-09', 'priorities', '5', 'Kevin', 'GZ Onboarding Communities');

-- Insert Marketing
INSERT OR REPLACE INTO weekly_entries (week_start, category, row_key, col_key, value) VALUES
('2026-02-09', 'marketing', 'Microvolunteerism Monday', 'FB Post', 'Business expo'),
('2026-02-09', 'marketing', 'WTK Wednesday', 'FB Post', 'Market Stats'),
('2026-02-09', 'marketing', 'Thoughtful Thursday', 'FB Post', 'Linens of Love'),
('2026-02-09', 'marketing', 'Office Closures', 'FB Post', 'Monday, 16th - Pres Day');
