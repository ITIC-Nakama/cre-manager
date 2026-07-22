# Titre proposé pour GitHub

**Intégrer Grafana (logs + métriques) sur le serveur ITIC CRE — accès sécurisé**

---

## Objectif

Mettre en place un **système de monitoring** pour la plateforme ITIC CRE déployée sur `cre.tech.iticparis.com` :

- **Logs** : backend Spring Boot, Nginx, fichiers applicatifs
- **Métriques** : JVM, requêtes HTTP, santé de l’API
- **Interface** : **Grafana** (tableaux de bord + exploration des logs)
- **Sécurité** : Prometheus et Loki restent sur localhost ; seule l’UI Grafana est exposée, avec authentification

---

## Contexte serveur (état actuel)

| Élément | Détail |
|---------|--------|
| Hébergement | Conteneur **LXC** sur **Proxmox** (`cre-manager`) |
| RAM | ~2 Go |
| Application | Spring Boot via **`itic-backend.service`** (port **8080**) |
| Frontend | Nginx → `/var/www/html` |
| API | Nginx proxy **`/api/v1`** → `localhost:8080` |
| Base | PostgreSQL 16 local |
| Déploiement app | GitHub Actions, mode **natif** (pas Docker pour l’app) |
| HTTPS | Non configuré aujourd’hui (HTTP port 80) |
| Logs app | Principalement **`journalctl -u itic-backend`** ; pas de fichier `application.log` exploité côté serveur pour l’instant |

**Accès SSH :** demander les identifiants au responsable infra (IP interne type `10.190.0.x`) — **ne pas** les mettre dans cette issue.

---

## Blocage connu : Docker sur le serveur

Docker est **installé** mais **ne démarre pas les conteneurs** :

```text
docker run alpine → pivot_root .: permission denied
systemd-detect-virt → lxc
```

**Cause :** Docker dans un LXC Proxmox sans feature **nesting**.

**Conséquence pour ce ticket :** choisir **une** des deux voies avant d’implémenter :

| Option A | Option B |
|----------|----------|
| Corriger l’infra : activer **`nesting=1`** sur le CT Proxmox (puis stack **Docker Compose** Grafana/Loki/Promtail/Prometheus) | Installer Grafana, Loki, Promtail, Prometheus en **natif** (systemd / binaires / apt) **sans** Docker |

Documenter le choix retenu dans la PR ou un commentaire sur l’issue.

---

## Architecture cible

```
Spring Boot (8080) ──metrics──► Prometheus (127.0.0.1:9090)
journald + nginx + logs app ──► Promtail ──► Loki (127.0.0.1:3100)
Grafana (127.0.0.1:3000) ◄── Prometheus + Loki
Nginx (cre.tech.iticparis.com) ──► /grafana/ + auth ──► Grafana
```

### Sécurité (obligatoire)

| Composant | Exposition |
|-----------|------------|
| Prometheus, Loki, Promtail, Actuator metrics | **`127.0.0.1` uniquement** — jamais ouvert sur Internet |
| Grafana | Exposé **uniquement** via Nginx, chemin **`/grafana/`** |

**Accès à Grafana — deux niveaux obligatoires :**

1. **Nginx `auth_basic`** : fichier htpasswd (ex. `/etc/nginx/.htpasswd-monitoring`), utilisateur dédié monitoring
2. **Login Grafana** : compte admin, `GF_AUTH_ANONYMOUS_ENABLED=false`, pas d’inscription publique

Les mots de passe (htpasswd + admin Grafana) sont créés sur le serveur, stockés hors Git (fichier `.env` chmod 600 ou coffre d’équipe).

**Renforcement optionnel** (à valider avec infra ITIC) : règles Nginx `allow` / `deny` si accès limité à une IP fixe ou au VPN du bureau. Ce n’est **pas** un substitut à la basic auth : les deux niveaux ci-dessus restent requis.

Ne **pas** exposer `/actuator` sur l’URL publique `/api/v1`.

---

## Travaux backend (repo `cre-manager`)

### Métriques Spring Boot

Ajouter les dépendances :

- `spring-boot-starter-actuator`
- `micrometer-registry-prometheus`

Configuration **`application.properties`** (ou variables d’environnement prod) :

```properties
management.server.port=8081
management.server.address=127.0.0.1
management.endpoints.web.exposure.include=health,prometheus
```

Le port **8081** ne doit **pas** être proxifié par Nginx vers Internet.

### Logs fichier (recommandé)

```properties
logging.file.name=logs/application.log
```

Sur le serveur : créer le dossier `logs/` dans le working directory du backend (`github-runner`), droits `github-runner`, redémarrer `itic-backend.service`.

---

## Travaux serveur (hors pipeline CD app)

Créer un répertoire dédié, ex. **`/opt/itic-monitoring/`**, contenant :

| Composant | Rôle |
|-----------|------|
| **Grafana** | Dashboards |
| **Loki** | Stockage logs |
| **Promtail** | Collecte journald (`itic-backend.service`), `/var/log/nginx/*.log`, `.../itic-cre-backend/logs/*.log` |
| **Prometheus** | Scrape `127.0.0.1:8081/actuator/prometheus` |

Paramètres Grafana :

- `GF_SERVER_ROOT_URL` = `http://cre.tech.iticparis.com/grafana/`
- `GF_SERVER_SERVE_FROM_SUB_PATH=true`
- `GF_AUTH_ANONYMOUS_ENABLED=false`
- Mot de passe admin dans un fichier **`.env`** sur le serveur (chmod 600), **pas** dans Git

### Nginx

Ajouter un bloc **`location /grafana/`** **à l’intérieur** du `server { }` existant (`/etc/nginx/sites-available/itic-cre`) :

```nginx
location /grafana/ {
    auth_basic "ITIC Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd-monitoring;

    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Créer le htpasswd : `htpasswd -c /etc/nginx/.htpasswd-monitoring <utilisateur>`  
Tester **`nginx -t`** avant `systemctl reload nginx`.

### Ressources (2 Go RAM)

Prévoir limites mémoire (~256 Mo par service), rétention logs/métriques **15 jours** max au début.

---

## Livrables attendus

- [ ] Stack monitoring installée et **démarrage au boot** (Docker Compose `restart: unless-stopped` ou services systemd)
- [ ] Grafana accessible via **`http://cre.tech.iticparis.com/grafana/`** — 401 sans identifiants Nginx, puis login Grafana
- [ ] Dashboard minimum : logs backend (Loki), métriques HTTP + JVM (Prometheus)
- [ ] Prometheus et Loki **non accessibles** depuis l’extérieur (vérifier avec `ss -tlnp` / curl depuis l’extérieur)
- [ ] Actuator/metrics **uniquement** sur `127.0.0.1:8081`
- [ ] Documentation courte : URL, où sont stockés les mots de passe, commandes start/stop

**Phase 2 (optionnel) :** HTTPS (Certbot), alertes Grafana → Discord.

---

## Hors scope

- Déploiement de l’app en Docker (l’app reste en systemd)
- Modifications UI ou fonctionnelles métier hors monitoring

---

## Plan de test

1. `curl -s http://127.0.0.1:8081/actuator/prometheus` sur le serveur → métriques présentes
2. Grafana Explore (Loki) → logs `itic-backend.service`
3. Depuis l’extérieur : `/grafana/` sans auth → **401** ; avec auth Nginx + Grafana → OK
4. Depuis l’extérieur : ports **9090** / **3100** → inaccessible
5. Redémarrage serveur → stack monitoring + app OK

---

## Références utiles dans le repo

- Déploiement actuel : `.github/workflows/cd.yml` (mode natif)
- Nginx site : `/etc/nginx/sites-available/itic-cre` (sur le serveur)
- Service backend : `/etc/systemd/system/itic-backend.service`

---

## Priorité

**Moyenne / infrastructure** — après validation du choix **Docker (nesting Proxmox)** vs **install native**.
