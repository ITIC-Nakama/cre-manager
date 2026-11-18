-- Jeu de données de NON-RÉGRESSION (lot 9) : 100 % fictif, volumineux, déterministe.
-- À lancer UNIQUEMENT sur une base JETABLE au schéma de main (V50) : la base doit contenir « nonreg » dans son nom.
--   psql -d itic_cre_nonreg -v ON_ERROR_STOP=1 -f scripts/nonreg/generate_dataset.sql
-- Mot de passe de tous les comptes générés : NonReg-2026! (comptes fictifs, domaine example.test, jamais en prod).
-- Volume : 18 promotions, 760 étudiants (sans promotion, désactivés, anonymisés, notés…), 12 conseillers, 1 admin,
-- 3 200 offres (équipe + 3 sources externes), 7 000 candidatures et leur historique, 2 400 candidatures jobboard,
-- 320 CV (fichiers posés par place_cv_files.py), commentaires de CV, historique XP, demandes d'aide.

DO $$ BEGIN
    IF current_database() NOT LIKE '%nonreg%' THEN
        RAISE EXCEPTION 'Refus : % n''est pas une base jetable de non-régression', current_database();
    END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT setseed(0.42);

CREATE TEMP TABLE nr_hash AS SELECT crypt('NonReg-2026!', gen_salt('bf', 10)) AS p;

-- ─── Promotions (noms réalistes : le rattachement aux formations se fait par mots-clés) ───
CREATE TEMP TABLE nr_promo(name text, has_years boolean);
INSERT INTO nr_promo VALUES
 ('BTS SIO 2025-2027', true), ('BTS SIO SISR 2024-2026', false), ('BTS SIO SLAM 2024-2026', false),
 ('BTS MCO 2025-2027', true), ('BTS NDRC 2025-2027', true), ('BTS CI 2025-2027', true), ('BTS CG 2025-2027', true),
 ('BTS COM 2025-2027', true), ('Bachelor RH 2025-2026', false), ('Bachelor Cybersécurité 2025-2026', false),
 ('Bachelor Développeur Full Stack 2025-2026', false), ('Bachelor CMDE 2025-2026', false),
 ('Mastère Cybersécurité 2025-2027', true), ('Mastère Fullstack 2025-2027', true), ('Mastère MRH 2025-2027', true),
 ('MSC 2025-2027', true), ('MSFO 2025-2027', true), ('Promotion archivée 2022', false);
INSERT INTO promotions(id, has_years, name)
SELECT gen_random_uuid(), has_years, name FROM nr_promo WHERE name NOT IN (SELECT name FROM promotions);

-- ─── Équipe : 12 conseillers, 1 admin ───
CREATE TEMP TABLE nr_staff AS
SELECT gen_random_uuid() AS id, g AS n, CASE WHEN g = 13 THEN 3 ELSE 2 END AS role_id FROM generate_series(1, 13) g;
INSERT INTO users(id, active, created_at, email, email_verified, first_name, lang, last_name, must_change_password, password, privacy_accepted, role_id)
SELECT s.id, true, now() - interval '400 days', 'nonreg.equipe' || s.n || '@example.test', true,
       (ARRAY['Nadia','Karim','Julie','Samuel','Inès','Paul','Leïla','Hugo','Sarah','Omar','Claire','Yanis','Alice'])[s.n],
       'fr', 'Équipe' || s.n, false, (SELECT p FROM nr_hash), true, s.role_id
FROM nr_staff s;
INSERT INTO advisors(user_id) SELECT id FROM nr_staff WHERE role_id = 2;
INSERT INTO admins(user_id) SELECT id FROM nr_staff WHERE role_id = 3;

-- ─── Étudiants ───
CREATE TEMP TABLE nr_student AS
SELECT gen_random_uuid() AS id, g AS n,
       (SELECT id FROM promotions WHERE name IN (SELECT name FROM nr_promo) ORDER BY name OFFSET (g % 18) LIMIT 1) AS promo,
       (SELECT id FROM nr_staff WHERE role_id = 2 ORDER BY n OFFSET (g % 12) LIMIT 1) AS advisor
FROM generate_series(1, 760) g;
-- Cas limites : 40 sans promotion, 70 sans référent.
UPDATE nr_student SET promo = NULL WHERE n % 19 = 0;
UPDATE nr_student SET advisor = NULL WHERE n % 11 = 0;

INSERT INTO users(id, active, created_at, deactivated_at, email, email_verified, first_name, lang, last_name, must_change_password,
                  password, phone_number, privacy_accepted, privacy_accepted_at, role_id)
SELECT s.id, (s.n % 25 <> 0), now() - (s.n || ' hours')::interval, CASE WHEN s.n % 25 = 0 THEN now() - interval '20 days' END,
       CASE WHEN s.n % 151 = 0 THEN 'deleted_' || s.id || '@rgpd.deleted' ELSE 'nonreg.etudiant' || s.n || '@example.test' END,
       true,
       CASE WHEN s.n % 151 = 0 THEN 'Anonyme' ELSE (ARRAY['Lina','Sami','Nora','Tom','Inès','Hugo','Léa','Lucas','Sarah','Yanis','Chloé','Adam','Emma','Rayan','Jade','Noah'])[1 + s.n % 16] END,
       CASE WHEN s.n % 9 = 0 THEN 'en' ELSE 'fr' END,
       CASE WHEN s.n % 151 = 0 THEN 'Utilisateur RGPD' ELSE 'Fictif' || s.n END,
       false, (SELECT p FROM nr_hash), CASE WHEN s.n % 3 = 0 THEN '06' || lpad((s.n * 7919 % 100000000)::text, 8, '0') END,
       true, now() - interval '100 days', 1
FROM nr_student s;
INSERT INTO students(user_id, xp_total, study_year, star_rating, last_activity, advisor_id, promotion_id)
SELECT s.id, (s.n * 37) % 900,
       CASE WHEN p.has_years THEN 1 + s.n % 2 END,
       CASE WHEN s.n % 4 = 0 THEN 1 + s.n % 3 END,
       now() - ((s.n % 60) || ' days')::interval, s.advisor, s.promo
FROM nr_student s LEFT JOIN promotions p ON p.id = s.promo;

-- ─── Offres : 800 de l'équipe, 2 400 externes ───
CREATE TEMP TABLE nr_title(t text);
INSERT INTO nr_title VALUES ('Chargé(e) de recrutement en alternance'), ('Assistant(e) RH'), ('Gestionnaire paie'),
 ('Développeur web full stack'), ('Développeur Java'), ('Analyste SOC cybersécurité'), ('Technicien support informatique'),
 ('Administrateur systèmes et réseaux'), ('Commercial terrain'), ('Conseiller de vente'), ('Assistant(e) comptable'),
 ('Chargé(e) de communication'), ('Community manager'), ('Business developer'), ('Contrôleur de gestion'),
 ('Hôte d''accueil'), ('Chargé(e) de clientèle banque'), ('Négociateur immobilier');
CREATE TEMP TABLE nr_offer AS SELECT gen_random_uuid() AS id, g AS n FROM generate_series(1, 3200) g;
INSERT INTO job_offers(id, is_active, company, created_at, updated_at, description, expires_at, external_link, location, published_at,
                       source, source_id, title, contract_type_id, created_by_id, email_candidature)
SELECT o.id, (o.n % 7 <> 0), 'Entreprise fictive ' || (o.n % 410),
       now() - ((o.n % 90) || ' days')::interval - ((o.n % 24) || ' hours')::interval, now() - ((o.n % 30) || ' days')::interval,
       CASE WHEN o.n % 4 = 0 THEN 'Poste en alternance. Postuler : rh' || o.n || '@example.test'
            ELSE 'Description de l''offre fictive n°' || o.n || ' : missions, profil, avantages.' END,
       CASE WHEN o.n % 4 <> 0 THEN now() + ((o.n % 60) || ' days')::interval END,
       CASE WHEN o.n % 4 <> 0 OR o.n % 8 = 0 THEN 'https://example.test/offre/' || o.n END,
       (ARRAY['75011 Paris', '93 - BOBIGNY', 'Nanterre 92000', 'Lyon', '94200 Ivry-sur-Seine', 'Télétravail', NULL, '77 - MEAUX'])[1 + o.n % 8],
       CASE WHEN o.n % 4 <> 0 THEN now() - ((o.n % 95) || ' days')::interval END,
       CASE WHEN o.n % 4 = 0 THEN 'MANUAL' ELSE (ARRAY['FRANCE_TRAVAIL','BONNE_ALTERNANCE','ADZUNA'])[1 + o.n % 3] END,
       CASE WHEN o.n % 4 <> 0 THEN 'NR-' || o.n END,
       (SELECT t FROM nr_title OFFSET (o.n % 18) LIMIT 1),
       (SELECT id FROM contract_types ORDER BY label OFFSET (o.n % (SELECT count(*) FROM contract_types)) LIMIT 1),
       CASE WHEN o.n % 4 = 0 THEN (SELECT id FROM nr_staff ORDER BY n OFFSET (o.n % 13) LIMIT 1) END,
       CASE WHEN o.n % 4 = 0 THEN 'rh' || o.n || '@example.test' END
FROM nr_offer o;

-- ─── Candidatures (suivi CRM) et leur historique ───
CREATE TEMP TABLE nr_app AS
SELECT gen_random_uuid() AS id, g AS n,
       (SELECT id FROM nr_student OFFSET (g * 13 % 760) LIMIT 1) AS student,
       (SELECT id FROM application_statuses ORDER BY ordre OFFSET (g % (SELECT count(*) FROM application_statuses)) LIMIT 1) AS status
FROM generate_series(1, 7000) g;
INSERT INTO applications(id, contract_verified, created_by_advisor, date_creation, date_modification, entreprise, poste, version,
                         via_jobboard, status_id, student_id, contract_type_id, start_date, notes, lien_offre)
SELECT a.id, (a.n % 5 = 0), (a.n % 9 = 0), now() - ((a.n % 120) || ' days')::interval, now() - ((a.n % 40) || ' days')::interval,
       'Entreprise fictive ' || (a.n % 410), (SELECT t FROM nr_title OFFSET (a.n % 18) LIMIT 1), 0, false, a.status, a.student,
       (SELECT id FROM contract_types ORDER BY label OFFSET (a.n % (SELECT count(*) FROM contract_types)) LIMIT 1),
       CASE WHEN a.n % 3 = 0 THEN current_date - (a.n % 200) END,
       CASE WHEN a.n % 6 = 0 THEN 'Relance prévue (note fictive)' END,
       CASE WHEN a.n % 2 = 0 THEN 'https://example.test/candidature/' || a.n END
FROM nr_app a;
INSERT INTO application_history(id, date_changement, application_id, new_status_id)
SELECT gen_random_uuid(), now() - ((a.n % 40) || ' days')::interval, a.id, a.status FROM nr_app a;

-- ─── Candidatures via le jobboard ───
INSERT INTO job_applications(id, applied_at, job_offer_id, student_id)
SELECT DISTINCT ON (o.id, s.id) gen_random_uuid(), now() - ((g % 50) || ' days')::interval, o.id, s.id
FROM generate_series(1, 2400) g
JOIN LATERAL (SELECT id FROM nr_offer OFFSET (g * 7 % 3200) LIMIT 1) o ON true
JOIN LATERAL (SELECT id FROM nr_student OFFSET (g * 11 % 760) LIMIT 1) s ON true;

-- ─── CV déposés (320) et commentaires ───
CREATE TEMP TABLE nr_cv AS
SELECT gen_random_uuid() AS id, s.id AS student, s.n FROM nr_student s WHERE s.n % 19 <> 0 AND s.n % 151 <> 0 AND s.n <= 380 AND s.n % 6 <> 0;
INSERT INTO cvs(id, file_path, uploaded_at, updated_at, version, xp_awarded, statut_id, student_id, source)
SELECT c.id, 'cvs/nonreg-' || c.n || '.pdf', now() - ((c.n % 80) || ' days')::interval, now() - ((c.n % 20) || ' days')::interval,
       0, (c.n % 2 = 0), (SELECT id FROM cv_statuts ORDER BY ordre OFFSET (c.n % (SELECT count(*) FROM cv_statuts)) LIMIT 1),
       c.student, 'UPLOAD'
FROM nr_cv c;
INSERT INTO cv_commentaires(id, contenu, created_at, advisor_id, cv_id)
SELECT gen_random_uuid(), 'Commentaire fictif : préciser les missions.', now() - interval '3 days',
       (SELECT id FROM nr_staff ORDER BY n OFFSET (c.n % 12) LIMIT 1), c.id
FROM nr_cv c WHERE c.n % 3 = 0;

-- ─── Historique XP et demandes d'aide ───
INSERT INTO xp_history(id, action, date_attribution, points, student_id)
SELECT gen_random_uuid(), 'CANDIDATURE_CREATED', now() - ((g % 100) || ' days')::interval, 10 + g % 30,
       (SELECT id FROM nr_student OFFSET (g * 17 % 760) LIMIT 1)
FROM generate_series(1, 3000) g;
INSERT INTO reclamations(id, message, status, student_id, date_creation)
SELECT gen_random_uuid(), 'Demande d''aide fictive n°' || g, CASE WHEN g % 3 = 0 THEN 'RESOLVED' ELSE 'PENDING' END,
       (SELECT id FROM nr_student OFFSET (g * 29 % 760) LIMIT 1), now() - ((g % 30) || ' days')::interval
FROM generate_series(1, 80) g;

ANALYZE;
SELECT 'Jeu de non-régression : ' || (SELECT count(*) FROM students) || ' étudiants, ' || (SELECT count(*) FROM job_offers)
       || ' offres, ' || (SELECT count(*) FROM applications) || ' candidatures, ' || (SELECT count(*) FROM cvs) || ' CV' AS bilan;
