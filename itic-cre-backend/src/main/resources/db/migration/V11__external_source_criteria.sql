-- Criteres de recherche par source externe, editables par un admin en base (plus de valeurs
-- figees en dur/redeploy). Codes ROME pour France Travail et La Bonne Alternance (les deux
-- exposent la taxonomie ROME) ; mots-cles et categorie pour Adzuna (pas de ROME cote Adzuna).
-- Vide = pas de restriction sur ce critere (ex: aucun code ROME -> toutes filieres, verifie en
-- conditions reelles sur l'API France Travail : le parametre codeROME est optionnel).
ALTER TABLE external_source_configs ADD COLUMN IF NOT EXISTS rome_codes VARCHAR(500);
ALTER TABLE external_source_configs ADD COLUMN IF NOT EXISTS departments VARCHAR(200);
ALTER TABLE external_source_configs ADD COLUMN IF NOT EXISTS keywords VARCHAR(500);
ALTER TABLE external_source_configs ADD COLUMN IF NOT EXISTS category VARCHAR(100);
