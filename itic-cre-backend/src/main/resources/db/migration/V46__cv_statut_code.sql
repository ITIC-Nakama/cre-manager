-- Code technique des statuts de CV reconnus par le code (voir CVStatutCode). Le nom reste libre
-- pour l'admin : la tache « Corriger votre CV » ne depend plus de nom.contains("corriger").
ALTER TABLE cv_statuts ADD COLUMN code varchar(30);
ALTER TABLE cv_statuts ADD CONSTRAINT uk_cv_statuts_code UNIQUE (code);
ALTER TABLE cv_statuts ADD CONSTRAINT cv_statuts_code_check CHECK (code IN ('A_CORRIGER'));

-- Reprise : le statut que l'ancienne regle reconnaissait (nom contenant « corriger »).
-- Un seul au plus (contrainte unique) : le premier actif par ordre si plusieurs correspondent.
UPDATE cv_statuts SET code = 'A_CORRIGER'
WHERE id = (SELECT id FROM cv_statuts
            WHERE lower(nom) LIKE '%corriger%'
            ORDER BY actif DESC, ordre ASC
            LIMIT 1);
