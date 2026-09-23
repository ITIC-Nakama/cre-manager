CREATE TABLE alumni_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    last_name varchar(100) NOT NULL,
    first_name varchar(100) NOT NULL,
    email varchar(255) NOT NULL,
    phone_number varchar(30),
    exit_year integer NOT NULL,
    formation varchar(150) NOT NULL,
    current_status varchar(20) NOT NULL,
    company varchar(150),
    job_title varchar(150),
    job_in_continuity boolean,
    continuity_formation varchar(150),
    salary_expectation varchar(100),
    recontact_consent boolean NOT NULL,
    gdpr_consent boolean NOT NULL,
    consent_version varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_alumni_contacts_email UNIQUE (email),
    CONSTRAINT alumni_contacts_current_status_check CHECK (current_status IN (
        'CDI','CDD','ALTERNANCE','STAGE','FREELANCE','JOB_SEARCH','TRAINING','OTHER'
    ))
);

CREATE INDEX idx_alumni_contacts_exit_year ON alumni_contacts(exit_year);
CREATE INDEX idx_alumni_contacts_created_at ON alumni_contacts(created_at DESC);

-- Ajoute ALUMNI_CONTACT_DELETED a la contrainte CHECK de audit_logs.action (voir AuditAction.java).
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
    'APPLICATION_CONTRACT_VERIFIED','APPLICATION_CONTRACT_REJECTED','APPLICATION_CONTRACT_DECLARED_BY_ADVISOR',
    'APPLICATION_CONTRACT_VALIDATED','APPLICATION_CONTRACT_INVALIDATED','APPLICATION_CREATED_BY_ADVISOR',
    'STUDENT_SELF_DELETED_GDPR','STUDENT_ANONYMIZED_BY_STAFF',
    'ALUMNI_CONTACT_DELETED',
    'OTHER'
));
