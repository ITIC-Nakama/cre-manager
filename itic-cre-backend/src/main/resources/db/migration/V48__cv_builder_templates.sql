-- Assistant de CV : modeles Lineaire et Bandeau, en plus de Classique et Moderne (voir CvTemplate).
ALTER TABLE cv_drafts DROP CONSTRAINT cv_drafts_template_code_check;
ALTER TABLE cv_drafts ADD CONSTRAINT cv_drafts_template_code_check
    CHECK (template_code IN ('LINEAIRE', 'CLASSIQUE', 'MODERNE', 'BANDEAU'));
