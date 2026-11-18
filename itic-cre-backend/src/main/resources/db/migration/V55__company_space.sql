-- Espace entreprise (remplace le Google Sites « Espace Entreprise - NOS CANDIDATS »).

-- 1. Statut de CV « Validé » reconnu par le code (son nom reste modifiable par l'admin).
ALTER TABLE cv_statuts DROP CONSTRAINT cv_statuts_code_check;
ALTER TABLE cv_statuts ADD CONSTRAINT cv_statuts_code_check CHECK (code IN ('A_CORRIGER', 'VALIDE'));
UPDATE cv_statuts SET code = 'VALIDE'
WHERE code IS NULL
  AND lower(unaccent(nom)) = 'valide'
  AND NOT EXISTS (SELECT 1 FROM cv_statuts WHERE code = 'VALIDE');

-- 2. Choix de l'étudiant : apparaître dans l'Espace entreprise (oui par défaut).
ALTER TABLE students ADD COLUMN company_space_visible boolean NOT NULL DEFAULT true;

-- 3. Annuaire : niveau -> domaine -> formation, avec l'adresse courte (slug) des anciens liens itic.short.gy.
CREATE TABLE company_space_programs (
    id               uuid PRIMARY KEY,
    level            varchar(20)  NOT NULL,
    domain           varchar(80)  NOT NULL,
    label            varchar(80)  NOT NULL,
    slug             varchar(60)  NOT NULL CONSTRAINT uk_company_space_programs_slug UNIQUE,
    slug_confirmed   boolean      NOT NULL DEFAULT false,
    legacy_url       varchar(255),
    match_keywords   varchar(255),
    study_year       integer,
    rhythm           varchar(120),
    availability     varchar(120),
    visible          boolean      NOT NULL DEFAULT true,
    sort_order       integer      NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT company_space_programs_level_check CHECK (level IN ('BTS', 'BACHELOR', 'MASTERE'))
);

-- Promotions du CRE rattachées à la main (sinon : rattachement automatique par mots-clés).
CREATE TABLE company_space_program_promotions (
    program_id   uuid NOT NULL REFERENCES company_space_programs (id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES promotions (id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, promotion_id)
);

-- 4. Textes et accès (une seule ligne).
CREATE TABLE company_space_settings (
    id                   integer PRIMARY KEY,
    home_title           varchar(150) NOT NULL,
    home_intro           varchar(2000),
    contact_title        varchar(150) NOT NULL,
    contact_text         varchar(2000),
    address              varchar(300),
    phone                varchar(40),
    promotion_intro      varchar(500) NOT NULL,
    warning_text         varchar(500),
    notification_email   varchar(254),
    private_access       boolean      NOT NULL DEFAULT false,
    access_key           varchar(64)  NOT NULL,
    programs_initialized boolean      NOT NULL DEFAULT false,
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 5. Demandes des entreprises (« Ce profil m'intéresse » / « Contactez-nous »).
CREATE TABLE company_space_requests (
    id            uuid PRIMARY KEY,
    program_id    uuid REFERENCES company_space_programs (id) ON DELETE SET NULL,
    student_id    uuid REFERENCES students (user_id) ON DELETE CASCADE,
    company       varchar(150)  NOT NULL,
    contact_name  varchar(150)  NOT NULL,
    email         varchar(254)  NOT NULL,
    phone         varchar(30),
    message       varchar(2000) NOT NULL,
    status        varchar(20)   NOT NULL DEFAULT 'NEW',
    created_at    timestamptz   NOT NULL DEFAULT now(),
    handled_at    timestamptz,
    handled_by_id uuid REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT company_space_requests_status_check CHECK (status IN ('NEW', 'HANDLED'))
);
CREATE INDEX idx_company_space_requests_status ON company_space_requests (status, created_at);
CREATE INDEX idx_company_space_requests_student ON company_space_requests (student_id);

-- 6. Statistiques simples : compteurs par jour et par formation, aucune donnée sur les visiteurs.
CREATE TABLE company_space_daily_stats (
    stat_day   date    NOT NULL,
    program_id uuid    NOT NULL REFERENCES company_space_programs (id) ON DELETE CASCADE,
    page_views integer NOT NULL DEFAULT 0,
    cv_views   integer NOT NULL DEFAULT 0,
    PRIMARY KEY (stat_day, program_id)
);
