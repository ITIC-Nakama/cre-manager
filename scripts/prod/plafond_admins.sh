#!/usr/bin/env bash
# Lot 10 — plafond d'admins à 4 sur le serveur. À NE LANCER QU'APRÈS LE « go » DE SAMUEL, dans Git Bash :
#
#     bash scripts/prod/plafond_admins.sh
#
# Utile seulement si verif_admins.sh montre ADMIN_MAX_ACTIVE présent avec une valeur inférieure à 4. Si la ligne est
# absente, le défaut du code (4 après le lot 10) suffit : ce script est inutile.
#
# ATTENTION : à chaque déploiement, cd.yml réécrit le .env du serveur depuis le secret GitHub BACKEND_ENV_CONTENT.
# Ce script corrige le serveur tout de suite ; la correction DURABLE est de mettre ADMIN_MAX_ACTIVE=4 (ou de retirer
# la ligne) dans ce secret, sinon le prochain déploiement remet l'ancienne valeur.
#
# Ce que fait le script, dans l'ordre (une seule connexion, mot de passe root tapé par Samuel) :
#   1. copie datée du .env à côté de l'original (.env.avant-plafond-AAAAMMJJ-HHMMSS, mêmes droits) ;
#   2. remplace la ligne ADMIN_MAX_ACTIVE par ADMIN_MAX_ACTIVE=4 (ou l'ajoute) ;
#   3. redémarre le service backend (sudo systemctl restart itic-backend.service, comme dans MISE_EN_PROD.md) ;
#   4. vérifie : santé UP, et le service en marche lit bien ADMIN_MAX_ACTIVE=4. L'endpoint de gouvernance
#      (GET /auth/admin/governance, maxActiveAdmins) demande une connexion admin : à regarder ensuite dans
#      Admin → Conseillers, qui affiche le plafond.
#
# RETOUR ARRIÈRE : sur le serveur, remettre la copie puis redémarrer :
#     cp -p <dossier>/.env.avant-plafond-<date> <dossier>/.env && sudo systemctl restart itic-backend.service
# Aucun mot de passe n'est écrit dans ce script ; rien n'est affiché du .env en dehors de la ligne ADMIN_MAX_ACTIVE.
set -euo pipefail
SERVER="${CRE_SERVER:-root@10.190.0.16}"

echo "Ce script va modifier le .env de production ($SERVER), puis redémarrer le backend (coupure de 1 à 2 minutes)."
read -r -p "Tape OUI pour continuer : " ANSWER
[ "$ANSWER" = "OUI" ] || { echo "Abandon : rien n'a été modifié."; exit 1; }

ssh "$SERVER" 'bash -s' <<'REMOTE'
set -euo pipefail
ENVF=$(systemctl show itic-backend.service -p EnvironmentFiles --value | grep -oE '/[^ ]+' | head -1)
[ -n "$ENVF" ] && [ -f "$ENVF" ] || { echo "Fichier d'environnement du service introuvable : rien n'a été modifié."; exit 1; }
COPY="$ENVF.avant-plafond-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENVF" "$COPY"
echo "1. Copie : $COPY"
if grep -q '^ADMIN_MAX_ACTIVE=' "$ENVF"; then
  sed -i --follow-symlinks 's/^ADMIN_MAX_ACTIVE=.*/ADMIN_MAX_ACTIVE=4/' "$ENVF"
else
  printf '\nADMIN_MAX_ACTIVE=4\n' >> "$ENVF"
fi
echo "2. $(grep '^ADMIN_MAX_ACTIVE=' "$ENVF")"
sudo systemctl restart itic-backend.service
echo "3. Service redémarré, attente de la santé…"
for i in $(seq 1 45); do
  if curl -sf -o /dev/null http://localhost:8080/api/v1/health; then OK=1; break; fi
  sleep 4
done
[ "${OK:-0}" = 1 ] || { echo "4. ÉCHEC : santé injoignable. Retour arrière : cp -p $COPY $ENVF && sudo systemctl restart itic-backend.service"; exit 1; }
PID=$(systemctl show itic-backend.service -p MainPID --value)
LIVE=$(tr '\0' '\n' < "/proc/$PID/environ" | grep '^ADMIN_MAX_ACTIVE=' || true)
echo "4. Santé UP ; valeur lue par le service : ${LIVE:-absente}"
[ "$LIVE" = "ADMIN_MAX_ACTIVE=4" ] || { echo "   ÉCHEC : le service ne lit pas 4. Retour arrière : cp -p $COPY $ENVF && sudo systemctl restart itic-backend.service"; exit 1; }
echo "OK : plafond à 4. À vérifier aussi dans Admin → Conseillers. Penser au secret BACKEND_ENV_CONTENT."
REMOTE
