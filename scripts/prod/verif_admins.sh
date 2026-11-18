#!/usr/bin/env bash
# Lot 10 — vérification avant mise en ligne, LECTURE SEULE. À lancer dans Git Bash (mot de passe root tapé par Samuel) :
#
#     ssh root@10.190.0.16 'bash -s' < scripts/prod/verif_admins.sh
#
# Affiche dans le terminal, et nulle part ailleurs :
#   1. la ligne ADMIN_MAX_ACTIVE du fichier d'environnement du service (grep de CETTE ligne seulement, rien d'autre du .env) ;
#   2. les comptes admin : e-mail, actif, date de création, dernière connexion (journal d'audit) ;
#   3. les demandes d'aide par statut et celles en attente avec leur date : avant le lot 10, elles seront reprises
#      dans la messagerie par V64 ; après, « en attente » doit être à 0 et « TRANSFERRED » égal à l'ancien nombre ;
#   4. la politique de sécurité du contenu (CSP) de Nginx, s'il en pose une (aide au code postal : geo.api.gouv.fr).
# Uniquement des SELECT (transaction en lecture seule) et des grep : aucune écriture, aucun redémarrage, aucun fichier créé.
set -u
ENV_FILES=$(systemctl show itic-backend.service -p EnvironmentFiles --value 2>/dev/null | grep -oE '/[^ ]+')
ENV_FILES=${ENV_FILES:-/dev/null}   # aucun fichier trouvé : grep lit /dev/null, jamais la suite du script
DB=$(grep -h '^DB_NAME=' $ENV_FILES 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"\r')
DB=${DB:-itic_cre}

echo "== 1. Plafond d'admins (ADMIN_MAX_ACTIVE)"
LINE=$(grep -h '^ADMIN_MAX_ACTIVE=' $ENV_FILES 2>/dev/null | tail -1 | tr -d '\r')
if [ -n "$LINE" ]; then
  echo "   $LINE   (fichier du serveur ; il est réécrit à chaque déploiement depuis le secret BACKEND_ENV_CONTENT)"
else
  echo "   absente (valeur par défaut du code : 3 avant le lot 10, 4 après)"
fi

q() {
  sudo -u postgres psql -X -q -At -F ' | ' -d "$DB" -c "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY" -c "$1" | grep -vx SET
}

echo "== 2. Comptes admin (e-mail | actif | créé le | dernière connexion)"
q "SELECT u.email,
          CASE WHEN u.active THEN 'oui' ELSE 'non' END,
          to_char(u.created_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD'),
          coalesce((SELECT to_char(max(a.created_at) AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI')
                    FROM audit_logs a WHERE a.actor_id = u.id AND a.action = 'LOGIN'), 'inconnue')
   FROM users u JOIN roles r ON r.id = u.role_id
   WHERE r.name = 'ADMIN' ORDER BY u.active DESC, u.created_at" | sed 's/^/   /'
q "SELECT 'actifs : ' || count(*) FILTER (WHERE u.active) || ' sur ' || count(*)
   FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'ADMIN'" | sed 's/^/   /'

echo "== 3. Demandes d'aide (V64 reprend celles en attente dans la messagerie, sans e-mail de rappel)"
q "SELECT 'par statut : ' || coalesce(string_agg(status || '=' || n, ' '), 'aucune') FROM (SELECT status, count(*) n FROM reclamations GROUP BY status ORDER BY status) x" | sed 's/^/   /'
q "SELECT 'en attente : ' || count(*) FROM reclamations WHERE status = 'PENDING'" | sed 's/^/   /'
q "SELECT to_char(date_creation AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD HH24:MI') || '  (' || status || ')'
   FROM reclamations WHERE status = 'PENDING' ORDER BY date_creation" | sed 's/^/   /'

echo "== 4. CSP de Nginx (si présente, connect-src doit autoriser https://geo.api.gouv.fr)"
CSP=$(grep -rhi 'content-security-policy' /etc/nginx 2>/dev/null | sed 's/^[[:space:]]*//' | head -3)
if [ -n "$CSP" ]; then echo "$CSP" | sed 's/^/   /'; else echo "   aucune CSP posée par Nginx : rien à changer"; fi
