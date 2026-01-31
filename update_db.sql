-- Add status column
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';

-- Add study_type column (Learning, Practice, Mock, Review)
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS study_type TEXT DEFAULT 'Learning';

-- Add ai_generated column to study_plan table
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;

-- Add duration column (in minutes)
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS duration INT DEFAULT 60;

-- Add day_number column for sequential plans
ALTER TABLE study_plan ADD COLUMN IF NOT EXISTS day_number INT;

-- Update user_profiles columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS target_math INT,
ADD COLUMN IF NOT EXISTS target_reading_writing INT,
ADD COLUMN IF NOT EXISTS exam_date TEXT,
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN DEFAULT FALSE;

-- Add Indexes for Performance
-- Creating indexes on frequently queried columns significantly speeds up reads
CREATE INDEX IF NOT EXISTS idx_study_plan_user_date ON study_plan (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_log_user_date ON daily_log (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_log_plan_id ON daily_log (plan_id);
