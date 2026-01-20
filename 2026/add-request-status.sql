-- Add request_status column to logs_requests table
ALTER TABLE logs_requests ADD COLUMN request_status TEXT;
-- Update existing rows to have a default status based on member_matched
UPDATE logs_requests SET request_status = CASE WHEN member_matched = 1 THEN 'SUCCESS' ELSE 'MEMBER_NOT_FOUND' END;
