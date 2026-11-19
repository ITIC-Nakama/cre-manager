-- Lot 10 (D) : la liste des types de contrat de « Publier une offre » contient CDI, CDD, Alternance, Stage et Job étudiant.
-- Idempotent : n'ajoute que les types absents. Ne renomme ni ne supprime les types dont dépend la synchronisation des
-- offres (CDI, CDD, Stage, Alternance, Inconnu : France Travail, Adzuna, La bonne alternance).
--
-- La base de prod est en SQL_ASCII : lower(), translate() et les comparaisons y travaillent OCTET PAR OCTET, et « é »
-- fait deux octets. Aucune comparaison ne repose donc sur une transformation d'un caractère accentué :
--   * les variantes connues de « Job étudiant » sont écrites en toutes lettres (égalité exacte, sûre dans tout encodage) ;
--   * chaque INSERT vérifie aussi le libellé exact qu'il insère, comme la contrainte unique contract_types_label_key.
-- (Première version, 19/11 : translate(lower(label), 'éèêë', 'eeee') ne reconnaissait plus « Job étudiant » après le
-- renommage, et le dernier INSERT heurtait la contrainte unique. Flyway annulait V63 et le serveur redémarrait en boucle.)

-- Un « Job étudiant » déjà créé à la main avec une autre orthographe (en prod : « Job Etudiant ») garde son identifiant
-- et ses offres ; seul son libellé est corrigé. Aucun autre type n'est touché.
UPDATE contract_types SET label = 'Job étudiant', updated_at = now()
WHERE id = (SELECT id FROM contract_types
            WHERE lower(trim(label)) IN ('job etudiant', 'job étudiant', 'job Étudiant', 'job etudiants', 'job étudiants')
            ORDER BY created_at LIMIT 1)
  AND label <> 'Job étudiant'
  AND NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'Job étudiant');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'CDI', 'Contrat à Durée Indéterminée', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'CDI' OR lower(trim(label)) = 'cdi');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'CDD', 'Contrat à Durée Déterminée', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'CDD' OR lower(trim(label)) = 'cdd');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Alternance', 'Contrat d''apprentissage ou de professionnalisation', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'Alternance' OR lower(trim(label)) = 'alternance');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Stage', 'Convention de stage (2 à 6 mois)', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'Stage' OR lower(trim(label)) = 'stage');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Job étudiant', 'Emploi à temps partiel compatible avec les études', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types
                  WHERE label = 'Job étudiant'
                     OR lower(trim(label)) IN ('job etudiant', 'job étudiant', 'job Étudiant', 'job etudiants', 'job étudiants'));
