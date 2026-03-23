-- Add link to projects
ALTER TABLE projects ADD COLUMN link TEXT;

-- Add notes and priority to project_steps
ALTER TABLE project_steps ADD COLUMN notes TEXT;
ALTER TABLE project_steps ADD COLUMN priority INTEGER DEFAULT 1;
