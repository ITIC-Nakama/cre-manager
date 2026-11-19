#!/usr/bin/env bash
# Tests de scripts/deploy/deploy_native.sh, SANS serveur : systemctl, curl, sudo, rsync et chown sont simulés.
# Lancé par cd.yml (job build, avant tout déploiement) et à la main : bash scripts/deploy/test_deploy_native.sh
#
# Le faux service lit le contenu du jar copié à l'emplacement d'ExecStart :
#   GOOD-…  démarre tout de suite ;   SLOW-<s>-…  répond après <s> secondes ;
#   BAD-…   plante et redémarre en boucle (NRestarts monte) ;   HANG-…  ne répond jamais, sans redémarrer.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/deploy_native.sh"
PASS=0; FAIL=0

ok()   { PASS=$((PASS + 1)); echo "  ok   $*"; }
ko()   { FAIL=$((FAIL + 1)); echo "  ÉCHEC $*"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }

make_stubs() {
  local bin="$1"
  mkdir -p "$bin"
  cat > "$bin/sudo" <<'EOF'
#!/usr/bin/env bash
exec "$@"
EOF
  cat > "$bin/chown" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  # rsync -a --delete SRC/ DEST/
  cat > "$bin/rsync" <<'EOF'
#!/usr/bin/env bash
src="${@: -2:1}"; dest="${@: -1}"
mkdir -p "$dest"; find "$dest" -mindepth 1 -delete; cp -r "$src/." "$dest/"
EOF
  cat > "$bin/systemctl" <<'EOF'
#!/usr/bin/env bash
S="$FAKE_STATE"
case "$*" in
  *"-p ExecStart --value"*)
    # Comme en prod le 19/11 : chemin relatif, que la détection ne reconnaît pas (FAKE_EXECSTART vide).
    echo "{ path=/usr/bin/java ; argv[]=/usr/bin/java -jar ${FAKE_EXECSTART:-itic-cre-backend-0.0.1-SNAPSHOT.jar} ; }" ;;
  *"-p NRestarts --value"*)
    n=$(cat "$S/restarts" 2>/dev/null || echo 0)
    if [ "$(cat "$S/mode")" = "BAD" ]; then n=$((n + 1)); echo "$n" > "$S/restarts"; fi
    echo "$n" ;;
  *"-p ActiveState --value"*)
    if [ "$(cat "$S/mode")" = "GOOD" ]; then echo active; else echo activating; fi ;;
  "restart nginx") : ;;
  restart*)
    echo "$(( $(cat "$S/count" 2>/dev/null || echo 0) + 1 ))" > "$S/count"
    content=$(cat "$FAKE_DEST")
    case "$content" in
      GOOD*) echo GOOD > "$S/mode" ;;
      SLOW-*) d=$(echo "$content" | cut -d- -f2); echo SLOW > "$S/mode"; echo $(( $(date +%s) + d )) > "$S/ready_at" ;;
      BAD*)  echo BAD > "$S/mode" ;;
      *)     echo HANG > "$S/mode" ;;
    esac
    cp "$FAKE_DEST" "$S/running" ;;
esac
exit 0
EOF
  cat > "$bin/curl" <<'EOF'
#!/usr/bin/env bash
S="$FAKE_STATE"
case "$(cat "$S/mode" 2>/dev/null)" in
  GOOD) exit 0 ;;
  SLOW) [ "$(date +%s)" -ge "$(cat "$S/ready_at")" ] && exit 0 || exit 22 ;;
  *) exit 22 ;;
esac
EOF
  chmod +x "$bin"/*
}

# Prépare un dossier de travail comme celui du runner. $1 = contenu du nouveau jar.
setup() {
  W=$(mktemp -d)
  mkdir -p "$W/repo/itic-cre-backend-incoming" "$W/repo/itic-cre-backend" "$W/repo/itic-cre-frontend/dist" \
           "$W/www" "$W/backups" "$W/state"
  echo "$1" > "$W/repo/itic-cre-backend-incoming/itic-cre-backend-0.0.1-SNAPSHOT.jar"
  echo "front-nouveau" > "$W/repo/itic-cre-frontend/dist/index.html"
  echo "front-ancien" > "$W/www/index.html"
  echo GOOD > "$W/state/mode"
  make_stubs "$W/bin"
  export FAKE_STATE="$W/state" FAKE_DEST="$W/repo/itic-cre-backend/itic-cre-backend-0.0.1-SNAPSHOT.jar"
}

run() {
  ( cd "$W/repo" && PATH="$W/bin:$PATH" BACKUP_ROOT="$W/backups" WEB_ROOT="$W/www" \
      HEALTH_TIMEOUT="${HT:-6}" HEALTH_INTERVAL=1 COMMIT_SHA="${SHA:-abc1234}" ENV_DATA="X=1" \
      BOOTSTRAP_JAR="${BOOT:-}" bash "$SCRIPT" ) > "$W/out.log" 2>&1
  echo $? > "$W/exit"
}

ex()      { cat "$W/exit"; }
running() { cat "$W/state/running" 2>/dev/null; }
front()   { cat "$W/www/index.html"; }
lastgood(){ cat "$W/backups/last-good.jar" 2>/dev/null; }
logs()    { cat "$W/out.log"; }

echo "1. Premier déploiement réussi : la version devient last-good.jar"
setup "GOOD-v2"; run
check "exit 0" '[ "$(ex)" = 0 ]'
check "la nouvelle version tourne" '[ "$(running)" = GOOD-v2 ]'
check "front nouveau en ligne" '[ "$(front)" = front-nouveau ]'
check "last-good.jar = v2" '[ "$(lastgood)" = GOOD-v2 ]'
check "commit noté" 'grep -q "commit abc1234" "$W/backups/last-good.txt"'
check ".env écrit, droits 600" '[ "$(cat "$W/repo/itic-cre-backend/.env")" = "X=1" ]'
check "avertissement « aucune version de secours » (rien avant)" 'logs | grep -q "Aucune version de secours"'

echo "2. Nouvelle version qui redémarre en boucle : retour à last-good, détecté avant la fin du délai"
setup "BAD-v3"; echo "GOOD-v2" > "$W/backups/last-good.jar"; echo "commit v2" > "$W/backups/last-good.txt"
T0=$(date +%s); HT=60 run; T1=$(date +%s)
check "exit 1 (le job échoue)" '[ "$(ex)" = 1 ]'
check "la version précédente tourne" '[ "$(running)" = GOOD-v2 ]'
check "front précédent remis" '[ "$(front)" = front-ancien ]'
check "last-good.jar inchangé" '[ "$(lastgood)" = GOOD-v2 ]'
check "boucle détectée en moins de 20 s (délai 60 s)" '[ $((T1 - T0)) -lt 20 ]'
check "message « Retour arrière réussi »" 'logs | grep -q "Retour arrière réussi"'

echo "3. Démarrage lent mais normal (8 s, délai 15 s) : pas de retour arrière"
setup "SLOW-8-v4"; echo "GOOD-v2" > "$W/backups/last-good.jar"; HT=15 run
check "exit 0" '[ "$(ex)" = 0 ]'
check "la nouvelle version tourne" '[ "$(running)" = SLOW-8-v4 ]'
check "last-good.jar = v4" '[ "$(lastgood)" = SLOW-8-v4 ]'

echo "4. Nouvelle version qui ne répond jamais (sans redémarrer) : retour arrière au bout du délai"
setup "HANG-v5"; echo "GOOD-v2" > "$W/backups/last-good.jar"; T0=$(date +%s); HT=4 run; T1=$(date +%s)
check "exit 1" '[ "$(ex)" = 1 ]'
check "la version précédente tourne" '[ "$(running)" = GOOD-v2 ]'
check "délai respecté (au moins 4 s)" '[ $((T1 - T0)) -ge 4 ]'

echo "5. Tout premier passage du nouveau pipeline (pas de last-good) : secours = artefact du dernier déploiement réussi"
setup "BAD-v6"; echo "GOOD-v1" > "$W/boot.jar"; BOOT="$W/boot.jar" run
check "exit 1" '[ "$(ex)" = 1 ]'
check "la version de l'artefact précédent tourne" '[ "$(running)" = GOOD-v1 ]'
check "aucun last-good créé par un échec" '[ ! -e "$W/backups/last-good.jar" ]'

echo "6. Jar en service détecté par ExecStart (chemin absolu) et pas de last-good : il sert de secours"
setup "BAD-v7"; echo "GOOD-v0" > "$FAKE_DEST"; FAKE_EXECSTART="$FAKE_DEST" run
check "exit 1" '[ "$(ex)" = 1 ]'
check "le jar en service a été remis" '[ "$(running)" = GOOD-v0 ]'
check "copie datée gardée" 'ls "$W/backups"/app-*.jar.bak >/dev/null 2>&1'

echo "7. Aucune version de secours : échec clair, rien de remis"
setup "BAD-v8"; run
check "exit 1" '[ "$(ex)" = 1 ]'
check "message « intervention manuelle »" 'logs | grep -q "Intervention manuelle nécessaire"'

echo "8. La version de secours échoue aussi : échec clair"
setup "BAD-v9"; echo "BAD-v2" > "$W/backups/last-good.jar"; run
check "exit 1" '[ "$(ex)" = 1 ]'
check "message « la version précédente ne répond pas non plus »" 'logs | grep -q "ne répond pas non plus"'

echo "9. Ménage : seules les 5 copies datées les plus récentes restent après un succès"
setup "GOOD-v10"; echo "GOOD-v2" > "$W/backups/last-good.jar"
for i in 1 2 3 4 5 6 7; do echo x > "$W/backups/app-2026010$i-000000.jar.bak"; touch -d "2026-01-0$i" "$W/backups/app-2026010$i-000000.jar.bak"; done
run
check "exit 0" '[ "$(ex)" = 0 ]'
check "5 copies datées gardées" '[ "$(ls "$W/backups"/app-*.jar.bak | wc -l | tr -d " ")" = 5 ]'

echo
echo "Résultat : $PASS ok, $FAIL échec(s)."
[ "$FAIL" -eq 0 ]
