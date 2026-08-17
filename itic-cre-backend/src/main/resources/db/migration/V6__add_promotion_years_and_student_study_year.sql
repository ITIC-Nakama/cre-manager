-- Migration V6 : Configuration des années d'étude sur les promotions et sur les étudiants

ALTER TABLE promotions ADD COLUMN has_years boolean NOT NULL DEFAULT false;

CREATE TABLE promotion_available_years (
    promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    study_year integer NOT NULL,
    PRIMARY KEY (promotion_id, study_year)
);

ALTER TABLE students ADD COLUMN study_year integer;
