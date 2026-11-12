-- Assistant de creation de CV (voir docs/CV_BUILDER_SPEC.md).
-- Un brouillon par etudiant ; les sections sont stockees en JSON dans une colonne TEXT
-- (compatible H2 pour les tests). Enregistrer un brouillon ne touche jamais la table cvs.
CREATE TABLE cv_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
    data text NOT NULL,
    template_code varchar(30) NOT NULL,
    accent_color varchar(7) NOT NULL,
    cv_lang varchar(2) NOT NULL,
    last_submitted_hash varchar(64),
    last_submitted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    CONSTRAINT uk_cv_drafts_student UNIQUE (student_id),
    CONSTRAINT cv_drafts_template_code_check CHECK (template_code IN ('CLASSIQUE','MODERNE')),
    CONSTRAINT cv_drafts_cv_lang_check CHECK (cv_lang IN ('fr','en'))
);

-- Origine du CV actif : depot manuel d'un PDF ou generation par l'assistant.
ALTER TABLE cvs ADD COLUMN source varchar(10) NOT NULL DEFAULT 'UPLOAD';
ALTER TABLE cvs ADD COLUMN template_code varchar(30);
ALTER TABLE cvs ADD CONSTRAINT cvs_source_check CHECK (source IN ('UPLOAD','BUILDER'));

-- Ajoute CV_GENERATED a la contrainte CHECK de audit_logs.action (voir AuditAction.java).
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'LOGIN','LOGOUT','STUDENT_REGISTERED','STAFF_USER_CREATED','USER_DELETED','USER_DEACTIVATED',
    'USER_REACTIVATED','PASSWORD_CHANGED','PASSWORD_RESET','EMAIL_VERIFIED',
    'CV_UPLOADED','CV_VALIDATED','CV_REJECTED','CV_DELETED','CV_STATUS_UPDATED','CV_COMMENTED',
    'CV_GENERATED',
    'TUTO_CREATED','TUTO_UPDATED','TUTO_DELETED',
    'PROMOTION_CREATED','PROMOTION_UPDATED','PROMOTION_DELETED',
    'STUDENT_REMOVED_FROM_PROMOTION','STUDENT_ASSIGNED_TO_PROMOTION',
    'STUDENT_ASSIGNED_TO_ADVISOR','STUDENT_REMOVED_FROM_ADVISOR',
    'JOB_OFFER_CREATED','JOB_OFFER_UPDATED','JOB_OFFER_DELETED','JOB_OFFER_ACTIVATED','JOB_OFFER_DEACTIVATED',
    'JOB_OFFER_WIPED',
    'APPLICATION_CONTRACT_VERIFIED','APPLICATION_CONTRACT_REJECTED','APPLICATION_CONTRACT_DECLARED_BY_ADVISOR',
    'APPLICATION_CONTRACT_VALIDATED','APPLICATION_CONTRACT_INVALIDATED','APPLICATION_CREATED_BY_ADVISOR',
    'STUDENT_SELF_DELETED_GDPR','STUDENT_ANONYMIZED_BY_STAFF',
    'ALUMNI_CONTACT_DELETED',
    'OTHER'
));
