-- La liste noire d'employeurs exclus passe d'un reglage par source (3 saisies identiques a
-- repeter dans external_source_configs) a un reglage global unique dans jobboard_sync_settings
-- (voir JobboardSyncSettings), applique aux trois sources externes en une seule fois.

ALTER TABLE jobboard_sync_settings ADD COLUMN IF NOT EXISTS excluded_employers VARCHAR(1000);

-- Reprise des valeurs deja saisies par un admin sur n'importe quelle source, fusionnees et dedupliquees.
UPDATE jobboard_sync_settings
SET excluded_employers = (
    SELECT string_agg(DISTINCT trim(value), ',')
    FROM external_source_configs, unnest(string_to_array(external_source_configs.excluded_employers, ',')) AS value
    WHERE external_source_configs.excluded_employers IS NOT NULL
      AND trim(external_source_configs.excluded_employers) <> ''
)
WHERE id = 'GLOBAL';

ALTER TABLE external_source_configs DROP COLUMN IF EXISTS excluded_employers;
