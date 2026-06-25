-- A executer manuellement en production apres le deploiement de ce commit.
-- Meme cause que 2026-06-23_fix_audit_logs_action_check.sql : ddl-auto=update
-- n'actualise jamais les contraintes CHECK existantes quand un enum gagne
-- de nouvelles valeurs.
--
-- Cause : ajout de PROMOTION_CREATED / PROMOTION_UPDATED / PROMOTION_DELETED /
-- STUDENT_REMOVED_FROM_PROMOTION / STUDENT_ASSIGNED_TO_PROMOTION a AuditAction.java.
-- Sans ce script, toute creation/modification/suppression de promotion ou
-- ajout/retrait/deplacement d'etudiant entre promotions echoue en production
-- (violation de la contrainte audit_logs_action_check), annulant toute la
-- transaction.

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'LOGIN','LOGOUT','STUDENT_REGISTERED','STAFF_USER_CREATED','USER_UPDATED',
    'USER_DELETED','USER_DEACTIVATED','USER_REACTIVATED','PASSWORD_CHANGED',
    'PASSWORD_RESET','EMAIL_VERIFIED','CV_UPLOADED','CV_VALIDATED','CV_REJECTED',
    'CV_DELETED','CV_STATUS_UPDATED','CV_COMMENTED','TUTO_CREATED','TUTO_UPDATED',
    'TUTO_DELETED','PROMOTION_CREATED','PROMOTION_UPDATED','PROMOTION_DELETED',
    'STUDENT_REMOVED_FROM_PROMOTION','STUDENT_ASSIGNED_TO_PROMOTION','OTHER'
));
