-- Add Annual Goal Link and Committee to Monthly Goals
ALTER TABLE monthly_goals ADD COLUMN annual_goal_id INTEGER;
ALTER TABLE monthly_goals ADD COLUMN committee TEXT;

-- Add Monthly Goal Link to Daily Tasks
ALTER TABLE daily_tasks ADD COLUMN linked_monthly_goal_id INTEGER;
