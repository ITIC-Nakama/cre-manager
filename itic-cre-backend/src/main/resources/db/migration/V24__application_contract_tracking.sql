ALTER TABLE application_statuses ADD COLUMN compte_comme_contrat boolean NOT NULL DEFAULT false;
UPDATE application_statuses SET compte_comme_contrat = true WHERE nom = 'Offre reçue';

ALTER TABLE applications ADD COLUMN start_date date;
ALTER TABLE applications ADD COLUMN end_date date;
