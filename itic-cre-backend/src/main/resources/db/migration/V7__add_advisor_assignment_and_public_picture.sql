ALTER TABLE advisors ADD COLUMN public_profile_picture varchar(255);

ALTER TABLE students ADD COLUMN advisor_id uuid REFERENCES advisors(user_id);

-- ddl-auto=update ne rafraichit jamais les contraintes CHECK existantes quand un enum
-- gagne de nouvelles valeurs (voir db-migrations/2026-06-23 et 2026-06-25 : deux
-- incidents production causes par le meme oubli). On la reconstruit ici, dans une
-- vraie migration Flyway cette fois, plutot que via un script manuel post-deploiement.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'LOGIN','LOGOUT','STUDENT_REGISTERED','STAFF_USER_CREATED','USER_UPDATED',
    'USER_DELETED','USER_DEACTIVATED','USER_REACTIVATED','PASSWORD_CHANGED',
    'PASSWORD_RESET','EMAIL_VERIFIED','CV_UPLOADED','CV_VALIDATED','CV_REJECTED',
    'CV_DELETED','CV_STATUS_UPDATED','CV_COMMENTED','TUTO_CREATED','TUTO_UPDATED',
    'TUTO_DELETED','PROMOTION_CREATED','PROMOTION_UPDATED','PROMOTION_DELETED',
    'STUDENT_REMOVED_FROM_PROMOTION','STUDENT_ASSIGNED_TO_PROMOTION',
    'STUDENT_ASSIGNED_TO_ADVISOR','STUDENT_REMOVED_FROM_ADVISOR','OTHER'
));
