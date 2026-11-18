-- Lot 10 (D) : la liste des types de contrat de « Publier une offre » contient CDI, CDD, Alternance, Stage et Job étudiant.
-- Idempotent : n'ajoute que les types absents. Ne renomme ni ne supprime les types dont dépend la synchronisation des
-- offres (CDI, CDD, Stage, Alternance, Inconnu : France Travail, Adzuna, La bonne alternance).
-- Comparaison sans casse ni accent (« Job Etudiant » = « Job étudiant ») : jamais de doublon.

-- Un « Job étudiant » déjà créé à la main avec une autre orthographe (en prod : « Job Etudiant ») garde son identifiant
-- et ses offres ; seul son libellé est corrigé. Aucun autre type n'est touché.
UPDATE contract_types SET label = 'Job étudiant', updated_at = now()
WHERE id = (SELECT id FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'job etudiant'
            ORDER BY created_at LIMIT 1)
  AND label <> 'Job étudiant'
  AND NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'Job étudiant');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'CDI', 'Contrat à Durée Indéterminée', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'cdi');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'CDD', 'Contrat à Durée Déterminée', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'cdd');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Alternance', 'Contrat d''apprentissage ou de professionnalisation', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'alternance');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Stage', 'Convention de stage (2 à 6 mois)', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'stage');

INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Job étudiant', 'Emploi à temps partiel compatible avec les études', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE translate(lower(trim(label)), 'éèêë', 'eeee') = 'job etudiant');
