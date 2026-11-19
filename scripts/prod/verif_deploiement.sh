# Contrôle d'un déploiement (MISE_EN_PROD §7.3), en LECTURE SEULE. Utilisé le 18/11 (pile #71 → #97, Flyway 61) ;
# lot 10 (après l'incident du 19/11) : Flyway attendu à 64 ; V62 est déjà appliquée, V63 et V64 passent le jour même.
# À lancer depuis Git Bash :  ssh root@10.190.0.16 'bash -s' < scripts/prod/verif_deploiement.sh
# Aucune écriture, aucun redémarrage. Seuls des versions, des nombres et des lignes de démarrage s'affichent.
DB=$(grep -h "^DB_NAME=" $(systemctl show itic-backend.service -p EnvironmentFiles --value | grep -oE "/[^ ]+") /dev/null 2>/dev/null | tail -1 | cut -d= -f2 | tr -d "\"\r")
DB=${DB:-itic_cre}
echo "== Service"
systemctl show itic-backend.service -p ActiveState -p SubState -p ActiveEnterTimestamp -p NRestarts
echo "== Flyway (lot 10 : 64 en tête, toutes à t, 0 échec)"
sudo -u postgres psql -X -At -d "$DB" -c "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY" -c "
  SELECT 'max=' || max(split_part(version, '.', 1)::int) FILTER (WHERE success)
      || ' echecs=' || count(*) FILTER (WHERE NOT success)
      || ' appliquees_aujourdhui=' || count(*) FILTER (WHERE installed_on::date = current_date)
  FROM flyway_schema_history" | grep -vx SET
sudo -u postgres psql -X -At -F ' ' -d "$DB" -c "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY" -c "
  SELECT version, success, to_char(installed_on, 'HH24:MI') FROM flyway_schema_history
  WHERE version IS NOT NULL ORDER BY installed_rank DESC LIMIT 12" | grep -vx SET | tr '\n' ';'; echo
echo "== Journal du lancement en cours (migrations, rattachement des formations, erreurs)"
J=$(journalctl --no-pager _SYSTEMD_INVOCATION_ID=$(systemctl show -p InvocationID --value itic-backend.service) 2>/dev/null)
echo "$J" | grep -oE "Successfully (applied|validated) [0-9]+ migrations?[^,]*" | tail -3
echo "$J" | grep -oE "Started [A-Za-z]+ in [0-9.]+ seconds" | tail -1
echo "$J" | grep -oE "Formations : [0-9]+ offre.{0,90}ms\)" | tail -2
echo "lignes ERROR : $(echo "$J" | grep -c ' ERROR ')"
echo "$J" | grep ' ERROR ' | grep -oE "[A-Za-z]+(Exception|Error)\b" | sort | uniq -c | sort -rn | head -5
