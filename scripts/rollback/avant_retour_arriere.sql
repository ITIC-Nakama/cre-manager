-- À lancer UNIQUEMENT en cas de retour arrière du code vers main (7ed25ef) APRÈS le déploiement de la pile #71 → #95,
-- juste avant de redémarrer l'ancien jar. Testé sur la base jetable itic_cre_nonreg (lot 9, voir docs/MISE_EN_PROD.md).
-- Les tables et colonnes ajoutées par V51 à V61 restent en place (l'ancien code les ignore) : rien n'est supprimé.
BEGIN;

-- 1. Statuts de CV : l'ancien code ne connaît pas le code « VALIDE » posé par V55 → sans cette ligne, « Mon CV »,
--    « Validation CV » et les statuts répondent 500.
UPDATE cv_statuts SET code = NULL WHERE code = 'VALIDE';

-- 2. Brouillons d'offres (#87) : l'ancien code ne sait pas qu'une offre peut être un brouillon ; il la montrerait aux
--    étudiants. On les met hors ligne (désactivées) : elles restent visibles de l'équipe, avec leur contenu.
UPDATE job_offers SET is_active = false WHERE draft = true;

-- 3. Notes sur 5 (#87) : l'ancien code affiche des étoiles (0 à 3). On recopie la dernière note dans les étoiles
--    (5 → 3, 4 → 2, 3 → 1, 1-2 → 0) pour ne rien perdre de visible.
UPDATE students SET star_rating = GREATEST(0, LEAST(3, latest_rating - 2)) WHERE latest_rating IS NOT NULL;

COMMIT;
