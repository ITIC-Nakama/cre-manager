ALTER TABLE students ADD COLUMN pending_level_up_grade_id uuid REFERENCES grades(id) ON DELETE SET NULL;
