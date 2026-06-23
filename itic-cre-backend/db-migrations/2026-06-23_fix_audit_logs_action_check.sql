-- A executer manuellement en production apres le deploiement de ce commit.
-- Pas d'outil de migration (Flyway/Liquibase) dans ce projet : le schema est
-- gere par Hibernate ddl-auto=update, qui AJOUTE les colonnes/tables manquantes
-- mais ne met JAMAIS a jour les contraintes CHECK existantes (ex: la liste de
-- valeurs autorisees pour un enum @Enumerated(STRING)).
--
-- Cause : ajout de USER_DEACTIVATED / USER_REACTIVATED a AuditAction.java.
-- Sans ce script, toute desactivation/reactivation de compte (conseiller ou
-- etudiant) echoue silencieusement en production : l'ecriture du log d'audit
-- viole la contrainte audit_logs_action_check, ce qui annule toute la
-- transaction (le compte n'est en realite jamais desactive, malgre une
-- reponse HTTP 200/400 trompeuse selon le cas).
--
-- Verifier d'abord que la contrainte existe avec son nom actuel :
--   SELECT conname FROM pg_constraint WHERE conname = 'audit_logs_action_check';

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'LOGIN','LOGOUT','STUDENT_REGISTERED','STAFF_USER_CREATED','USER_UPDATED',
    'USER_DELETED','USER_DEACTIVATED','USER_REACTIVATED','PASSWORD_CHANGED',
    'PASSWORD_RESET','EMAIL_VERIFIED','CV_UPLOADED','CV_VALIDATED','CV_REJECTED',
    'CV_DELETED','CV_STATUS_UPDATED','CV_COMMENTED','TUTO_CREATED','TUTO_UPDATED',
    'TUTO_DELETED','OTHER'
));
