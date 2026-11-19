#!/usr/bin/env bash
# Déploiement natif de l'API et du front (appelé par .github/workflows/cd.yml, job « deploy », runner self-hosted,
# depuis la racine du dépôt). Testé hors serveur par scripts/deploy/test_deploy_native.sh (scénarios d'échec compris).
#
# Principe (incident du 19/11 : nouvelle version en échec, aucun jar de secours, prod coupée jusqu'au revert) :
#   * le dernier jar qui a passé le contrôle de santé est TOUJOURS gardé : $BACKUP_ROOT/last-good.jar (hors du dossier
#     de travail du runner, que actions/checkout vide à chaque déploiement) ;
#   * contrôle de santé pendant HEALTH_TIMEOUT secondes (120 par défaut : un démarrage normal prend moins d'une minute),
#     interrompu plus tôt si le service redémarre en boucle ou passe en échec ;
#   * en cas d'échec : le jar précédent et le front précédent sont remis, le service redémarre, puis est contrôlé à son
#     tour. Le job échoue quand même (exit 1) : la nouvelle version n'est pas en ligne.
#   * Les migrations Flyway ne sont pas annulées : une migration réussie reste en base. L'ancien jar l'ignore (Flyway
#     laisse de côté les migrations plus récentes que les siennes), comme le 19/11 avec V62.
#
# Ordre de préférence pour la version de secours : last-good.jar, sinon le jar en service (s'il existe encore sur
# disque), sinon BOOTSTRAP_JAR (artefact du dernier déploiement réussi, téléchargé par cd.yml au tout premier passage).
set -euo pipefail

SERVICE="${SERVICE:-itic-backend.service}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/github-runner/itic-cre-backups}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/api/v1/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
# Redémarrages automatiques tolérés pendant le contrôle avant de conclure à une boucle (Restart=always).
MAX_RESTARTS_DURING_CHECK="${MAX_RESTARTS_DURING_CHECK:-2}"
WEB_ROOT="${WEB_ROOT:-/var/www/html}"
INCOMING_DIR="${INCOMING_DIR:-itic-cre-backend-incoming}"
FRONT_DIST="${FRONT_DIST:-itic-cre-frontend/dist}"
BACKEND_DIR="${BACKEND_DIR:-itic-cre-backend}"
BOOTSTRAP_JAR="${BOOTSTRAP_JAR:-}"
COMMIT_SHA="${COMMIT_SHA:-inconnu}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

LAST_GOOD="$BACKUP_ROOT/last-good.jar"
LAST_GOOD_INFO="$BACKUP_ROOT/last-good.txt"
FRONT_PREVIOUS="$BACKUP_ROOT/frontend-previous"
TS=$(date +%Y%m%d-%H%M%S)

log() { echo "[deploy] $*"; }
mkdir -p "$BACKUP_ROOT"

restarts() { systemctl show "$SERVICE" -p NRestarts --value 2>/dev/null | tr -dc '0-9' || true; }
state() { systemctl show "$SERVICE" -p ActiveState --value 2>/dev/null || true; }

# Attend que l'API réponde. 0 = en bonne santé ; 1 = délai dépassé, boucle de redémarrage ou service en échec.
wait_healthy() {
  local label="$1" start r0 r elapsed s
  start=$(date +%s)
  r0=$(restarts); r0=${r0:-0}
  while true; do
    if curl -sfL -o /dev/null "$HEALTH_URL"; then
      log "$label : API en bonne santé après $(( $(date +%s) - start )) s."
      return 0
    fi
    elapsed=$(( $(date +%s) - start ))
    r=$(restarts); r=${r:-0}
    s=$(state)
    if [ $(( r - r0 )) -ge "$MAX_RESTARTS_DURING_CHECK" ]; then
      log "$label : le service a redémarré $(( r - r0 )) fois pendant le contrôle (boucle de redémarrage)."
      return 1
    fi
    if [ "$s" = "failed" ]; then
      log "$label : service en échec (ActiveState=failed)."
      return 1
    fi
    if [ "$elapsed" -ge "$HEALTH_TIMEOUT" ]; then
      log "$label : pas de réponse après ${HEALTH_TIMEOUT} s."
      return 1
    fi
    sleep "$HEALTH_INTERVAL"
  done
}

# --- 1. Jar en service et version de secours, AVANT toute modification ---
# Chemin du jar découvert dans l'unité systemd (inchangé depuis le début : c'est là que la nouvelle version est copiée).
CURRENT_JAR=$(systemctl show "$SERVICE" -p ExecStart --value 2>/dev/null | grep -oE '/[^ ]+\.jar' | head -1 || true)
NEW_JAR=$(ls "$INCOMING_DIR"/*.jar 2>/dev/null | head -1 || true)
if [ -z "$NEW_JAR" ]; then
  echo "::error::Aucun jar à déployer dans $INCOMING_DIR."
  exit 1
fi
DEST_JAR="${CURRENT_JAR:-$BACKEND_DIR/$(basename "$NEW_JAR")}"

ROLLBACK_JAR=""
if [ -s "$LAST_GOOD" ]; then
  ROLLBACK_JAR="$LAST_GOOD"
  log "Version de secours : dernier jar validé ($(cat "$LAST_GOOD_INFO" 2>/dev/null || echo 'sans détail'))."
elif [ -n "$CURRENT_JAR" ] && [ -f "$CURRENT_JAR" ]; then
  ROLLBACK_JAR="$BACKUP_ROOT/app-${TS}.jar.bak"
  cp "$CURRENT_JAR" "$ROLLBACK_JAR"
  log "Version de secours : jar en service, copié dans $ROLLBACK_JAR."
elif [ -n "$BOOTSTRAP_JAR" ] && [ -s "$BOOTSTRAP_JAR" ]; then
  ROLLBACK_JAR="$BACKUP_ROOT/bootstrap-${TS}.jar"
  cp "$BOOTSTRAP_JAR" "$ROLLBACK_JAR"
  log "Version de secours : artefact du dernier déploiement réussi, copié dans $ROLLBACK_JAR."
else
  echo "::warning::Aucune version de secours (ni last-good.jar, ni jar en service, ni artefact précédent) : en cas d'échec, rien ne pourra être remis."
fi

if [ -d "$WEB_ROOT" ] && [ -n "$(ls -A "$WEB_ROOT" 2>/dev/null)" ]; then
  sudo rm -rf "$FRONT_PREVIOUS"
  sudo cp -r "$WEB_ROOT" "$FRONT_PREVIOUS"
fi

# --- 2. Déploiement (inchangé) ---
echo "${ENV_DATA:-}" > "$BACKEND_DIR/.env"
chmod 600 "$BACKEND_DIR/.env"
# Le .env reste sur disque (chmod 600) : le service a « Restart=always » et systemd relit EnvironmentFile= à chaque
# redémarrage. Le supprimer casserait le redémarrage automatique après un crash (ex. OOM).
sudo chown -R github-runner:github-runner "$BACKEND_DIR"

# rsync : ne touche que les fichiers modifiés et supprime les fichiers obsolètes.
sudo rsync -a --delete "$FRONT_DIST/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT/"

sudo cp "$NEW_JAR" "$DEST_JAR"
sudo systemctl restart "$SERVICE"
sudo systemctl restart nginx

# --- 3. Contrôle de santé, et retour à la version précédente en cas d'échec ---
if wait_healthy "Nouvelle version ($COMMIT_SHA)"; then
  # Ce jar devient la version de secours du prochain déploiement (copie puis renommage : jamais de fichier à moitié écrit).
  cp "$NEW_JAR" "$LAST_GOOD.tmp" && mv -f "$LAST_GOOD.tmp" "$LAST_GOOD"
  echo "commit $COMMIT_SHA, validé le $(date '+%Y-%m-%d %H:%M:%S')" > "$LAST_GOOD_INFO"
  # Ménage : seules les KEEP_BACKUPS copies datées les plus récentes sont gardées.
  # (ls renvoie une erreur si un motif ne trouve rien : sans « || true », set -e ferait échouer un déploiement réussi.)
  { ls -1t "$BACKUP_ROOT"/app-*.jar.bak "$BACKUP_ROOT"/bootstrap-*.jar 2>/dev/null || true; } \
    | tail -n +$(( KEEP_BACKUPS + 1 )) | xargs -r rm -f
  log "Déploiement réussi ; last-good.jar mis à jour."
  exit 0
fi

echo "::error::Contrôle de santé en échec après déploiement : retour à la version précédente."
if [ -n "$ROLLBACK_JAR" ]; then
  sudo cp "$ROLLBACK_JAR" "$DEST_JAR"
  if [ -d "$FRONT_PREVIOUS" ]; then
    sudo rsync -a --delete "$FRONT_PREVIOUS/" "$WEB_ROOT/"
    sudo chown -R www-data:www-data "$WEB_ROOT/"
  fi
  sudo systemctl restart "$SERVICE"
  sudo systemctl restart nginx
  if wait_healthy "Version précédente"; then
    echo "::error::Retour arrière réussi : la prod tourne à nouveau sur la version précédente. La nouvelle version n'est PAS en ligne."
  else
    echo "::error::Retour arrière tenté, mais la version précédente ne répond pas non plus : intervention manuelle nécessaire."
  fi
else
  echo "::error::Aucune version de secours : rien n'a été remis, le service reste sur la version en échec. Intervention manuelle nécessaire."
fi
exit 1
