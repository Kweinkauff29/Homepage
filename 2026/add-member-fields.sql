-- Add tags and contact_balance columns to members table
ALTER TABLE members ADD COLUMN tags TEXT;
ALTER TABLE members ADD COLUMN contact_balance REAL;
