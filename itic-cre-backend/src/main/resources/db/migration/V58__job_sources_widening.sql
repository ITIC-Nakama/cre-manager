-- Sources d'offres : élargissement et agrégateur.
-- Ajouter les codes ROME des formations ITIC (annuaire) aux critères de France Travail et La Bonne Alternance,
-- et chercher en Île-de-France quand aucune zone n'est saisie. Deux réglages globaux, modifiables par l'admin.
ALTER TABLE jobboard_sync_settings ADD COLUMN include_formation_rome boolean NOT NULL DEFAULT true;
ALTER TABLE jobboard_sync_settings ADD COLUMN default_zone_ile_de_france boolean NOT NULL DEFAULT true;

-- Appels payants par source et par mois (plafond mensuel de l'agrégateur JSearch).
CREATE TABLE provider_api_usage (
    source varchar(30) NOT NULL,
    usage_month varchar(7) NOT NULL,
    calls  integer     NOT NULL DEFAULT 0,
    PRIMARY KEY (source, usage_month)
);
