-- Comble le trou historique introduit par V24 : les candidatures deja "Offre recue" avant
-- l'existence du suivi "sous contrat" ont recu start_date = NULL (colonne ajoutee sans backfill).
-- Or `start_date = MAX(start_date)` (comparaison de "derniere declaration") ne matche jamais quand
-- les deux cotes sont NULL (NULL = NULL vaut NULL en SQL, jamais true) : ces dossiers restent
-- invisibles au filtre "sous contrat" et a l'alerte "a verifier", indefiniment, tant que personne
-- ne modifie manuellement leurs dates.
UPDATE applications a
SET start_date = COALESCE(
    (SELECT MAX(h.date_changement)::date
     FROM application_history h
     WHERE h.application_id = a.id AND h.new_status_id = a.status_id),
    a.date_modification::date
)
FROM application_statuses s
WHERE a.status_id = s.id
  AND s.compte_comme_contrat = true
  AND a.start_date IS NULL;
