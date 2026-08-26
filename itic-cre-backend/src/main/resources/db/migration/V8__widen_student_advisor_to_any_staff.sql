-- Elargit la cible de Student.advisor : un etudiant peut desormais etre suivi par un
-- ADVISOR ou un ADMIN (les deux peuvent etre affectes comme "conseiller referent"),
-- alors que la FK V7 ne pointait que vers advisors(user_id). La colonne referencait
-- deja des UUID de la table users (heritage JOINED, advisors.user_id = users.id),
-- il s'agit donc uniquement d'elargir la contrainte, pas de migrer de donnees.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_advisor_id_fkey;

ALTER TABLE students ADD CONSTRAINT students_advisor_id_fkey
    FOREIGN KEY (advisor_id) REFERENCES users(id);
