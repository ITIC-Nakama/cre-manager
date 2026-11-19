-- Lot 10 (A) : adresse postale de l'étudiant (dossier administratif : conventions de stage, contrats d'alternance).
-- Le code postal existe déjà (V56, carte des étudiants) : il sert aussi d'adresse. Colonnes nullables : les étudiants
-- déjà inscrits n'en ont pas, ils la complètent depuis leur profil (bandeau « Complète ton adresse »).
ALTER TABLE students ADD COLUMN address_line1 varchar(120);
ALTER TABLE students ADD COLUMN address_line2 varchar(120);
ALTER TABLE students ADD COLUMN city varchar(80);
