CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_student_fullname_trgm
ON users USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_student_email_trgm
ON users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_application_entreprise_trgm
ON applications USING gin (entreprise gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_application_poste_trgm
ON applications USING gin (poste gin_trgm_ops);
