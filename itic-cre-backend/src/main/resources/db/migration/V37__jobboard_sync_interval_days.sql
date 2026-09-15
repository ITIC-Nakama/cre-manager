-- Permet a un admin de choisir la frequence de la synchro planifiee (ex: tous les 2 ou 3 jours)
-- au lieu d'une frequence fixe (quotidienne, cron fixe). Voir JobboardSyncSettings.syncIntervalDays
-- et ExternalJobSyncService.scheduledSync — le cron continue de "tick" chaque jour, mais l'execution
-- reelle de la synchro est desormais conditionnee au nombre de jours ecoules depuis la derniere
-- synchro reussie.
ALTER TABLE jobboard_sync_settings ADD COLUMN IF NOT EXISTS sync_interval_days INTEGER NOT NULL DEFAULT 1;
