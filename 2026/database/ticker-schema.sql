-- Migration: Add completed_at to daily_tasks
ALTER TABLE daily_tasks ADD COLUMN completed_at DATETIME;

-- Migration: Create task_reactions table
CREATE TABLE IF NOT EXISTS task_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reaction TEXT NOT NULL, -- 'thumbs_up', 'heart', 'clap', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(task_id, user_id, reaction) -- Prevent duplicate same-reaction from same user
);
