CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE UNIQUE INDEX IF NOT EXISTS uk_job_offers_source_id ON job_offers (source_id) WHERE source_id IS NOT NULL;

DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT con.conname INTO fk_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE con.contype = 'f' AND con.conrelid = 'promotion_available_years'::regclass
      AND att.attname = 'promotion_id' AND con.confdeltype != 'c';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE promotion_available_years DROP CONSTRAINT %I', fk_name);
        ALTER TABLE promotion_available_years ADD CONSTRAINT promotion_available_years_promotion_id_fkey
            FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Nettoie les references orphelines laissees par l'absence de cette FK jusqu'ici — exactement
-- ce que ON DELETE SET NULL aurait fait automatiquement si la contrainte avait toujours existe.
UPDATE xp_history SET application_id = NULL
WHERE application_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.id = xp_history.application_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
        WHERE con.contype = 'f' AND con.conrelid = 'xp_history'::regclass
          AND att.attname = 'application_id'
    ) THEN
        ALTER TABLE xp_history ADD CONSTRAINT xp_history_application_id_fkey
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL;
    END IF;
END $$;
