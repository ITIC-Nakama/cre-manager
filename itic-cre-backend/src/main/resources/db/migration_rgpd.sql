-- Migration SQL pour ajouter les colonnes RGPD sur la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(10) DEFAULT '1.0';
