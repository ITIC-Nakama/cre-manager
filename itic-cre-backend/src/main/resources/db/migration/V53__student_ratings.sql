-- Note des etudiants par l'equipe (document Drive de Jules) : note de 1 a 5 + commentaire facultatif, historisee
-- (qui, quand), visible par l'equipe seulement. Remplace la note en etoiles (0 a 3) : la colonne star_rating est
-- gardee (retour arriere possible) mais n'est plus ecrite par l'interface ni lue par les filtres.

CREATE TABLE student_ratings (
    id uuid PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
    -- Compte de l'equipe supprime : la note reste, sans auteur (« Ancien conseiller »).
    author_id uuid REFERENCES users(id) ON DELETE SET NULL,
    score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment varchar(1000),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_ratings_student ON student_ratings (student_id, created_at DESC);

-- Derniere note, gardee sur l'etudiant : colonne triable et filtre « note minimale » de la liste.
ALTER TABLE students ADD COLUMN latest_rating integer;

-- Reprise des anciennes etoiles (0 a 3) : note = etoiles + 2 (0 -> 2, 1 -> 3, 2 -> 4, 3 -> 5), auteur inconnu.
INSERT INTO student_ratings (id, student_id, author_id, score, comment, created_at)
SELECT gen_random_uuid(), user_id, NULL, star_rating + 2,
       'Reprise de l''ancienne note : ' || star_rating || ' étoile(s) sur 3', now()
FROM students WHERE star_rating IS NOT NULL;
UPDATE students SET latest_rating = star_rating + 2 WHERE star_rating IS NOT NULL;
