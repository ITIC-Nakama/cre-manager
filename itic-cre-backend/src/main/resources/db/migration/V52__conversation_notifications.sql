-- Messagerie : e-mails « Vous avez un nouveau message » sans avalanche. Par fil et par destinataire (l'etudiant
-- pour les messages de l'equipe, le referent pour ceux de l'etudiant) : date du dernier e-mail (au plus un toutes les
-- 15 minutes) et dernier message traite (deja signale, ou lu avant qu'un e-mail ne parte).
ALTER TABLE conversations ADD COLUMN student_notified_at timestamptz;
ALTER TABLE conversations ADD COLUMN student_notified_message_id bigint;
ALTER TABLE conversations ADD COLUMN staff_notified_at timestamptz;
ALTER TABLE conversations ADD COLUMN staff_notified_message_id bigint;
