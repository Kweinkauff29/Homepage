-- Add missing columns to pillar_suggestions table
-- Run: npx wrangler d1 execute wrap_sheet --file=add-pillar-columns.sql --remote -c wrangler-wrapsheet.toml

-- Add progress tracking columns
ALTER TABLE pillar_suggestions ADD COLUMN progress_percent INTEGER DEFAULT 0;
ALTER TABLE pillar_suggestions ADD COLUMN eta_date TEXT;
ALTER TABLE pillar_suggestions ADD COLUMN progress_notes TEXT;
ALTER TABLE pillar_suggestions ADD COLUMN completed_at TEXT;
