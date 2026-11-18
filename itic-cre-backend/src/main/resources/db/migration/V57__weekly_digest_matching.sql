-- Récapitulatif du lundi et rapprochement offres / formations.
-- Codes ROME et mots-clés d'offres par formation de l'annuaire (préremplis au démarrage, modifiables par l'équipe).
ALTER TABLE company_space_programs ADD COLUMN rome_codes varchar(255);
ALTER TABLE company_space_programs ADD COLUMN offer_keywords varchar(1000);
ALTER TABLE company_space_settings ADD COLUMN matching_initialized boolean NOT NULL DEFAULT false;
-- Abonnement au récapitulatif du lundi (oui par défaut ; lien de désinscription dans l'e-mail).
ALTER TABLE students ADD COLUMN email_weekly_digest boolean NOT NULL DEFAULT true;
