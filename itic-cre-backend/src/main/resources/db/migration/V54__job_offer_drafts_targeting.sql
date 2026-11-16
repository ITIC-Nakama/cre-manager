-- Document Drive de Jules : brouillons d'offre, « Promotions ciblées » et e-mail du soir des offres ciblees.

-- Offre enregistree comme brouillon : visible de l'equipe seulement, jamais des etudiants.
ALTER TABLE job_offers ADD COLUMN draft boolean NOT NULL DEFAULT false;
-- Publication par l'equipe (creation publiee, ou publication d'un brouillon) : « offres publiees dans la journee ».
ALTER TABLE job_offers ADD COLUMN staff_published_at timestamptz;
UPDATE job_offers SET staff_published_at = created_at WHERE source = 'MANUAL';

-- Promotions ciblees d'une offre de l'equipe : jamais affichees aux etudiants.
CREATE TABLE job_offer_target_promotions (
    job_offer_id uuid NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    PRIMARY KEY (job_offer_id, promotion_id)
);
CREATE INDEX idx_job_offer_target_promotions_promotion ON job_offer_target_promotions (promotion_id);

-- Preference de l'etudiant : e-mail du soir des offres ciblees (active par defaut, lien de desinscription).
ALTER TABLE students ADD COLUMN email_targeted_offers boolean NOT NULL DEFAULT true;

-- Verrou des envois programmes : une ligne par (type d'envoi, periode, destinataire), posee AVANT l'envoi.
-- Deux executions du meme envoi (relance, deux instances) ne peuvent pas ecrire deux fois a la meme personne.
CREATE TABLE scheduled_mailings (
    kind varchar(40) NOT NULL,
    period_key varchar(20) NOT NULL,
    recipient_id uuid NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, period_key, recipient_id)
);
