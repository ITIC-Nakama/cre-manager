-- Carte des étudiants : code postal saisi par l'étudiant ou l'équipe, département déduit (seul affiché sur la carte).
ALTER TABLE students ADD COLUMN postal_code varchar(5);
ALTER TABLE students ADD COLUMN department varchar(3);
CREATE INDEX idx_students_department ON students (department);
