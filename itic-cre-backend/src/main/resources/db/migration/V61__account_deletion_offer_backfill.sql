-- Lot 9 : suppression définitive d'un compte de l'équipe. Ses commentaires de CV restent, sans auteur
-- (affichés « Compte supprimé ») : la colonne de l'auteur devient facultative. Aucune donnée modifiée.
ALTER TABLE cv_commentaires ALTER COLUMN advisor_id DROP NOT NULL;

-- Lot 9 : rattachement unique des offres déjà en ligne à leurs formations, fait au démarrage (OfferProgramBackfill).
ALTER TABLE company_space_settings ADD COLUMN offers_linked_initialized boolean NOT NULL DEFAULT false;
