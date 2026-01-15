-- Add source column to pillar_suggestions table
-- Run: npx wrangler d1 execute wrap_sheet --file=add-source-column.sql --remote -c wrangler-wrapsheet.toml

-- Add the source column (nullable, allows existing data to work)
ALTER TABLE pillar_suggestions ADD COLUMN source TEXT;

-- Optional: Update existing staff-created items (if you know which ones they are)
-- UPDATE pillar_suggestions SET source = 'staff' WHERE assigned_to_id IS NOT NULL AND created_by_id = assigned_to_id;
