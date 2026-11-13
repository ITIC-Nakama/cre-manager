-- Photo du CV : on garde l'ORIGINAL (re-encode, sans EXIF) et la zone choisie par l'etudiant au recadrage ;
-- chaque modele en derive son format au rendu (carre pour le Lineaire, portrait 5:6 pour les autres), centre sur
-- cette zone : changer de modele ne demande jamais de recadrer. Zone en fractions (0 a 1) de l'image.
-- NULL = toute l'image : photos envoyees avant V50, deja recadrees en 5:6.
ALTER TABLE cv_photos ADD COLUMN crop_x double precision;
ALTER TABLE cv_photos ADD COLUMN crop_y double precision;
ALTER TABLE cv_photos ADD COLUMN crop_width double precision;
ALTER TABLE cv_photos ADD COLUMN crop_height double precision;
