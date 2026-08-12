-- Ajoute un verrou optimiste (colonne "version") sur applications et cvs pour empecher
-- qu'un changement de statut concurrent (double-clic, retry reseau) ne credite l'XP deux
-- fois en ecrasant silencieusement une mise a jour par une autre.
--
-- DEFAULT 0 permet a Postgres d'ajouter la colonne NOT NULL et de remplir les lignes
-- existantes en une seule instruction atomique. ddl-auto=update ne sait pas faire ca :
-- un ALTER TABLE ADD COLUMN ... NOT NULL sans DEFAULT echoue des qu'une table contient
-- deja des lignes (voir l'incident documente dans db-migrations/2026-06-23_fix_audit_logs_action_check.sql
-- pour un probleme de meme nature avec ddl-auto).

ALTER TABLE applications ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE cvs ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
