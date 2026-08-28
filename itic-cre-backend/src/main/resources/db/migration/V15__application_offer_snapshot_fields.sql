-- Complete l'instantane deja pris a la creation d'une candidature (entreprise/poste/lienOffre)
-- avec les champs necessaires a un affichage riche (description, localisation, logo) sans jamais
-- dependre de la survie de l'offre d'origine — coherent avec le decouplage introduit en V14.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offre_description TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offre_location VARCHAR(500);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS offre_company_logo_url VARCHAR(2048);
