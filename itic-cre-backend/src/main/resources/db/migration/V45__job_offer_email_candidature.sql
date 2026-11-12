-- Adresse e-mail de candidature d'une offre (bouton « Postuler » par e-mail), extraite de sa description.
-- L'application la remplit à chaque création ou modification d'offre par le staff et à chaque import
-- d'offre externe (ApplicationEmailExtractor).
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS email_candidature VARCHAR(320);

-- Rattrapage des offres existantes, une seule fois (Flyway), avec le même motif que
-- ApplicationEmailExtractor.EMAIL_REGEX : syntaxe identique en Java et en PostgreSQL, première adresse
-- trouvée, mise en minuscules. Idempotent : ne touche que les offres sans adresse et dont la description
-- en contient une.
UPDATE job_offers
SET email_candidature = lower(substring(description FROM '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'))
WHERE email_candidature IS NULL
  AND description ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  AND length(substring(description FROM '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')) <= 320;
