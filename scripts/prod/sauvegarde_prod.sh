#!/usr/bin/env bash
# Sauvegarde de la base de prod du CRE avant une mise en ligne (MISE_EN_PROD §7.1), en LECTURE SEULE.
#     bash scripts/prod/sauvegarde_prod.sh
# À lancer toi-même dans Git Bash (pas PowerShell : PowerShell 5.1 abîme les fichiers binaires redirigés).
# Le mot de passe root est demandé UNE fois.
# - pg_dump et les SELECT ne font que lire (transaction en lecture seule pour les comptages).
# - Aucune écriture en base, aucune migration, aucun redémarrage, aucun fichier laissé sur le serveur.
# - Destination : hors du dépôt git et hors OneDrive (dossier personnel, pas Documents/Bureau).
# - Seuls des nombres s'affichent (taille, version Flyway, comptages) : aucune donnée personnelle.
set -euo pipefail
DEST="$HOME/CRE-sauvegardes-prod"
mkdir -p "$DEST"
FILE="$DEST/cre-prod-$(date +%Y-%m-%d_%H%M).dump"
INFO="$FILE.controle.txt"

ssh root@10.190.0.16 '
  set -e
  DB=$(grep -h "^DB_NAME=" $(systemctl show itic-backend.service -p EnvironmentFiles --value | grep -oE "/[^ ]+") 2>/dev/null | tail -1 | cut -d= -f2 | tr -d "\"\r")
  DB=${DB:-itic_cre}
  {
    echo "Base : $DB"
    sudo -u postgres psql -X -At -d "$DB" -c "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY" -c "
      SELECT '"'"'taille='"'"' || pg_size_pretty(pg_database_size(current_database()))
        || '"'"' flyway_max='"'"' || (SELECT max(split_part(version, '"'"'.'"'"', 1)::int) FROM flyway_schema_history WHERE success)
        || '"'"' flyway_echecs='"'"' || (SELECT count(*) FROM flyway_schema_history WHERE NOT success)
        || '"'"' users='"'"' || (SELECT count(*) FROM users)
        || '"'"' applications='"'"' || (SELECT count(*) FROM applications)
        || '"'"' job_offers='"'"' || (SELECT count(*) FROM job_offers)" | grep -vx SET
  } >&2
  sudo -u postgres pg_dump -Fc --lock-wait-timeout=10s -d "$DB"
' > "$FILE" 2> >(tee "$INFO" >&2)

sleep 1
ls -l "$FILE"
echo "Contrôles enregistrés dans $INFO"
echo "OK — écris « sauvegarde faite » et je prends la suite (test de restauration local, puis go merge)."
