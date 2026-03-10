ALTER TABLE project_steps ADD COLUMN completed_by_id INTEGER REFERENCES users(id);
