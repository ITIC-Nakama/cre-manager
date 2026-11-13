-- Photo propre au CV (assistant de CV) : une par etudiant, distincte de la photo de profil (users.profile_picture).
-- Le fichier est deja recadre et re-encode en JPEG sans metadonnees (CvPhotoImages) ; il est prive :
-- chemin cv-photos/{studentId}-{horodatage}.jpg, jamais sous le dossier public des avatars.
-- Sans ligne ici, le CV reprend la photo de profil (« Revenir a ma photo de profil » supprime la ligne).
CREATE TABLE cv_photos (
    student_id uuid PRIMARY KEY REFERENCES students(user_id) ON DELETE CASCADE,
    storage_path varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
