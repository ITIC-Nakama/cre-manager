-- Ajoute les actions JOB_OFFER_* a la contrainte CHECK de audit_logs.action (voir AuditAction.java).
-- Meme incident deja rencontre a deux reprises (db-migrations/2026-06-23 et 2026-06-25) : oublier
-- de reconstruire cette contrainte quand l'enum gagne de nouvelles valeurs fait echouer l'insertion
-- de l'audit log en production des le premier appel avec une nouvelle action.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'LOGIN','LOGOUT','STUDENT_REGISTERED','STAFF_USER_CREATED','USER_DELETED','USER_DEACTIVATED',
    'USER_REACTIVATED','PASSWORD_CHANGED','PASSWORD_RESET','EMAIL_VERIFIED',
    'CV_UPLOADED','CV_VALIDATED','CV_REJECTED','CV_DELETED','CV_STATUS_UPDATED','CV_COMMENTED',
    'TUTO_CREATED','TUTO_UPDATED','TUTO_DELETED',
    'PROMOTION_CREATED','PROMOTION_UPDATED','PROMOTION_DELETED',
    'STUDENT_REMOVED_FROM_PROMOTION','STUDENT_ASSIGNED_TO_PROMOTION',
    'STUDENT_ASSIGNED_TO_ADVISOR','STUDENT_REMOVED_FROM_ADVISOR',
    'JOB_OFFER_CREATED','JOB_OFFER_UPDATED','JOB_OFFER_DELETED','JOB_OFFER_ACTIVATED','JOB_OFFER_DEACTIVATED',
    'JOB_OFFER_WIPED',
    'OTHER'
));
