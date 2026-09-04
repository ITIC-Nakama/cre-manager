ALTER TABLE xp_history ADD COLUMN application_id uuid REFERENCES applications(id) ON DELETE SET NULL;
