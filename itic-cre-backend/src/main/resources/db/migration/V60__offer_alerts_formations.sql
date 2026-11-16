-- Lot 8 : rattachement offre <-> formation, alertes instantanées par formation, filtres par formation.

-- 1. Offre <-> formation (annuaire de l'Espace entreprise). manual = choisi par l'équipe ; sinon déduit à l'import.
CREATE TABLE job_offer_programs (
    offer_id   uuid        NOT NULL REFERENCES job_offers (id) ON DELETE CASCADE,
    program_id uuid        NOT NULL REFERENCES company_space_programs (id) ON DELETE CASCADE,
    manual     boolean     NOT NULL DEFAULT false,
    linked_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (offer_id, program_id)
);
CREATE INDEX idx_job_offer_programs_program ON job_offer_programs (program_id, offer_id);

-- Code ROME de l'offre quand la source le donne (France Travail) : rattachement des offres importées.
ALTER TABLE job_offers ADD COLUMN rome_code varchar(10);

-- 2. Interrupteur des alertes par formation (activé par défaut) et préférence de l'étudiant (oui par défaut).
ALTER TABLE company_space_programs ADD COLUMN alerts_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE students ADD COLUMN email_instant_offers boolean NOT NULL DEFAULT true;

-- 3. File d'envoi des alertes : une ligne par (offre, étudiant), jamais deux.
CREATE TABLE offer_alert_outbox (
    id              uuid         PRIMARY KEY,
    offer_id        uuid         NOT NULL REFERENCES job_offers (id) ON DELETE CASCADE,
    student_id      uuid         NOT NULL REFERENCES students (user_id) ON DELETE CASCADE,
    program_id      uuid         REFERENCES company_space_programs (id) ON DELETE SET NULL,
    status          varchar(20)  NOT NULL,
    attempts        integer      NOT NULL DEFAULT 0,
    next_attempt_at timestamptz  NOT NULL DEFAULT now(),
    created_at      timestamptz  NOT NULL DEFAULT now(),
    sent_at         timestamptz,
    mail_id         uuid,
    grouped         boolean      NOT NULL DEFAULT false,
    last_error      varchar(500),
    CONSTRAINT uk_offer_alert_outbox UNIQUE (offer_id, student_id),
    CONSTRAINT offer_alert_outbox_status_check
        CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DEFERRED', 'EVENING', 'SKIPPED'))
);
CREATE INDEX idx_offer_alert_outbox_pending ON offer_alert_outbox (status, next_attempt_at);
CREATE INDEX idx_offer_alert_outbox_student ON offer_alert_outbox (student_id, sent_at);

-- Filtre « Formation(s) » des listes étudiants et candidatures : promotion + année d'étude.
CREATE INDEX IF NOT EXISTS idx_students_promotion_study_year ON students (promotion_id, study_year);

-- Liens courts vérifiés (docs/LIENS_COURTS.md) : ces trois slugs déduits existent bien chez Short.io.
UPDATE company_space_programs SET slug_confirmed = true
WHERE slug IN ('bts-gpme1a', 'bts-gpme2a', 'mast-com1a') AND slug_confirmed = false;
