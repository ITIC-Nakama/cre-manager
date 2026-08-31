-- "category" est desormais une liste CSV de tags Adzuna (une seule categorie ne peut pas
-- representer les 5+ filieres ITIC), boucle comme les codes ROME cote France Travail.
-- VARCHAR(100) est trop etroit des que plusieurs tags sont combines ; aligne sur rome_codes/
-- keywords (VARCHAR(500)) pour laisser de la marge a un admin qui voudrait en ajouter d'autres.
ALTER TABLE external_source_configs ALTER COLUMN category TYPE VARCHAR(500);
