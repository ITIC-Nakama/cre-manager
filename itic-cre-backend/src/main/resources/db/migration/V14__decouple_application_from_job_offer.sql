-- Une candidature (Application) doit rester valable meme si l'offre d'origine est supprimee :
-- les champs utiles (entreprise, poste, typeContrat, lienOffre) sont deja copies a la creation.
-- via_jobboard devient un fait permanent, persiste une fois pour toutes, independant du cycle
-- de vie de l'offre — auparavant derive de "source_job_offer_id IS NOT NULL", ce qui bloquait
-- silencieusement la suppression de toute offre ayant recu une candidature.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS via_jobboard BOOLEAN NOT NULL DEFAULT false;
UPDATE applications SET via_jobboard = true WHERE source_job_offer_id IS NOT NULL;

-- source_job_offer_id reste une vraie FK (integrite referentielle tant que l'offre existe,
-- utile pour le retrait cote jobboard et l'affichage de l'offre complete), mais passe en
-- ON DELETE SET NULL : supprimer une offre ne doit plus jamais etre bloque par son historique
-- de candidatures, juste detacher la reference sur les candidatures concernees.
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'applications'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'source_job_offer_id'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE applications DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE applications
        ADD CONSTRAINT applications_source_job_offer_id_fkey
        FOREIGN KEY (source_job_offer_id) REFERENCES job_offers(id) ON DELETE SET NULL;
END $$;
