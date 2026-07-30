-- V2: Add deactivated_at column for RGPD anonymization scheduling
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;
