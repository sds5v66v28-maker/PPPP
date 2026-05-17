-- Add section (group) and due_time columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time text; -- HH:mm format
