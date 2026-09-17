-- Note manuelle conseiller/admin (0 a 3 etoiles) sur un etudiant, jamais visible cote etudiant.
-- Nullable : null = jamais note, distinct d'une note explicite de 0.
ALTER TABLE students ADD COLUMN IF NOT EXISTS star_rating INTEGER;
ALTER TABLE students ADD CONSTRAINT students_star_rating_check CHECK (star_rating IS NULL OR star_rating BETWEEN 0 AND 3);
