-- « Ma fiche formation » : page de la formation sur le site pédagogique (préremplie au démarrage, modifiable par l'admin).
ALTER TABLE company_space_programs ADD COLUMN pedagogy_url varchar(500);
ALTER TABLE company_space_settings ADD COLUMN pedagogy_initialized boolean NOT NULL DEFAULT false;
