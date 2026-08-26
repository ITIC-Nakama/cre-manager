-- V3: Jobboard externe — agrégation d'offres depuis des sources externes
-- (France Travail, La Bonne Alternance, Adzuna, ...)

ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS company_logo_url VARCHAR(2048);
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Idempotence : une seule offre par identifiant source (les offres manuelles ont source_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uk_job_offers_source_id ON job_offers (source_id) WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_offers_source ON job_offers (source);
CREATE INDEX IF NOT EXISTS idx_job_offers_expires_at ON job_offers (expires_at);
