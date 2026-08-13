-- Secteurs d'activite pour les offres d'emploi. Uniquement rempli pour les offres
-- creees manuellement par un conseiller/admin ; les offres importees depuis des
-- sources externes (a venir) resteront sans secteur (sector_id NULL) tant qu'aucun
-- mappage fiable n'existe entre leur categorisation et la notre.

CREATE TABLE sectors (
    id          uuid PRIMARY KEY,
    label       varchar(100) NOT NULL UNIQUE,
    description varchar(500),
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamp(6) with time zone NOT NULL,
    updated_at  timestamp(6) with time zone
);

ALTER TABLE job_offers ADD COLUMN sector_id uuid REFERENCES sectors(id);
