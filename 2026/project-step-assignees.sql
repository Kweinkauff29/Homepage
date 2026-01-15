CREATE TABLE IF NOT EXISTS project_step_assignees (
    step_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (step_id, user_id)
);
