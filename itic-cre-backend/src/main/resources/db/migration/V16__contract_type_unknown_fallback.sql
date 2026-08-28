INSERT INTO contract_types (id, label, description, active, created_at, updated_at)
SELECT gen_random_uuid(), 'Inconnu', 'Type de contrat non determine par la source externe', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM contract_types WHERE label = 'Inconnu');
