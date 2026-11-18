-- Non-régression (lot 9) : empreinte des données EXISTANTES, à prendre avant et après les migrations V51+ ;
-- deux empreintes identiques = rien de perdu ni de modifié dans les tables et colonnes qui existaient déjà en V50.
-- (Les colonnes ajoutées par les migrations ne font pas partie de l'empreinte.)
SELECT 'users', count(*), md5(string_agg(concat_ws('|', id, email, first_name, last_name, active::text, role_id), ',' ORDER BY id)) FROM users
UNION ALL SELECT 'students', count(*), md5(string_agg(concat_ws('|', user_id, xp_total, coalesce(study_year::text,''), coalesce(promotion_id::text,''), coalesce(advisor_id::text,''), coalesce(star_rating::text,'')), ',' ORDER BY user_id)) FROM students
UNION ALL SELECT 'promotions', count(*), md5(string_agg(concat_ws('|', id, name, has_years::text), ',' ORDER BY id)) FROM promotions
UNION ALL SELECT 'job_offers', count(*), md5(string_agg(concat_ws('|', id, title, company, is_active::text, source, coalesce(created_by_id::text,''), coalesce(location,''), coalesce(external_link,'')), ',' ORDER BY id)) FROM job_offers
UNION ALL SELECT 'applications', count(*), md5(string_agg(concat_ws('|', id, student_id, status_id, entreprise, poste, contract_verified::text, coalesce(start_date::text,''), coalesce(notes,'')), ',' ORDER BY id)) FROM applications
UNION ALL SELECT 'application_history', count(*), md5(string_agg(concat_ws('|', id, application_id, new_status_id), ',' ORDER BY id)) FROM application_history
UNION ALL SELECT 'job_applications', count(*), md5(string_agg(concat_ws('|', id, student_id, job_offer_id), ',' ORDER BY id)) FROM job_applications
UNION ALL SELECT 'cvs', count(*), md5(string_agg(concat_ws('|', id, student_id, statut_id, file_path), ',' ORDER BY id)) FROM cvs
UNION ALL SELECT 'cv_commentaires', count(*), md5(string_agg(concat_ws('|', id, cv_id, advisor_id, contenu), ',' ORDER BY id)) FROM cv_commentaires
UNION ALL SELECT 'cv_statuts', count(*), md5(string_agg(concat_ws('|', id, nom, actif::text), ',' ORDER BY id)) FROM cv_statuts
UNION ALL SELECT 'xp_history', count(*), md5(string_agg(concat_ws('|', id, student_id, points), ',' ORDER BY id)) FROM xp_history
UNION ALL SELECT 'reclamations', count(*), md5(string_agg(concat_ws('|', id, student_id, status, message), ',' ORDER BY id)) FROM reclamations
UNION ALL SELECT 'flyway_v1_v50', count(*), md5(string_agg(concat_ws('|', version, coalesce(checksum::text,'')), ',' ORDER BY installed_rank)) FROM flyway_schema_history WHERE split_part(version, '.', 1)::int <= 50
ORDER BY 1;
