-- ==============================================================================
-- Migration PostgreSQL: Optimisation Recherche Floue via pg_trgm & Index GIN
-- ==============================================================================

-- 1. Activation de l'extension pg_trgm (Trigram matching pour ILIKE '%search%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Index GIN trigramme sur le nom complet de l'étudiant
CREATE INDEX IF NOT EXISTS idx_users_student_fullname_trgm 
ON users USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- 3. Index GIN trigramme sur l'email de l'étudiant
CREATE INDEX IF NOT EXISTS idx_users_student_email_trgm 
ON users USING gin (email gin_trgm_ops);

-- 4. Index GIN trigramme sur l'entreprise et le poste des candidatures
CREATE INDEX IF NOT EXISTS idx_application_entreprise_trgm 
ON application USING gin (entreprise gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_application_poste_trgm 
ON application USING gin (poste gin_trgm_ops);
