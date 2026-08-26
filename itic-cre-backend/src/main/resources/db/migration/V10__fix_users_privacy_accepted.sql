-- V4: Fix schema drift — la colonne privacy_accepted est attendue par l'entité User
-- mais l'ALTER automatique Hibernate échoue sur les bases avec des lignes existantes
-- (NOT NULL sans valeur par défaut).
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ALTER COLUMN privacy_accepted DROP DEFAULT;
