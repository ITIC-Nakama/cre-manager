#!/usr/bin/env bash
# Comptage des offres disponibles avec les critères de main et ceux de la PR #91 — LECTURE SEULE.
#
#   Lancement (Git Bash, mot de passe root tapé par l'utilisateur) :
#     ssh root@10.190.0.16 'bash -s' < comptage_offres.sh
#
# Ce que fait le script :
#   - lit la configuration du service itic-backend (fichier d'environnement trouvé via systemd) EN MÉMOIRE ;
#   - lit la base en transaction READ ONLY (aucune écriture possible) : offres actives, critères, plafonds, journaux de synchro ;
#   - interroge France Travail, La Bonne Alternance, Adzuna (et JSearch seulement si une clé existe) en RECHERCHE seule,
#     en lisant les totaux renvoyés plutôt que de tout télécharger, avec un plafond d'appels par source ;
#   - n'écrit aucun fichier, ne redémarre rien, n'affiche ni clé, ni URL, ni donnée personnelle : seulement des nombres.
# Variables de test (local uniquement) : CRE_ENV_FILE, CRE_PSQL, CRE_DB, CRE_MOCK_HTTP=1.
set -u
umask 077
ENVF="${CRE_ENV_FILE:-}"
if [ -z "$ENVF" ]; then
  ENVF=$(systemctl show itic-backend.service -p EnvironmentFiles --value 2>/dev/null | grep -oE '/[^ ]+' | head -1)
fi
if [ -z "$ENVF" ] || [ ! -r "$ENVF" ]; then
  echo "Fichier d'environnement du service introuvable (systemctl show itic-backend.service)."
  exit 1
fi
PYBIN="${CRE_PYTHON:-python3}"
command -v "$PYBIN" >/dev/null || { echo "python3 absent du serveur"; exit 1; }
export CRE_ENV_FILE="$ENVF"
exec "$PYBIN" - <<'PY'
import json, os, re, subprocess, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request

# ─── Configuration lue en mémoire, jamais affichée ─────────────────────────────────────────────
def load_env(path):
    env = {}
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[7:]
            k, v = line.split("=", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            env[k.strip()] = v
    return env

E = load_env(os.environ["CRE_ENV_FILE"])
SECRETS = sorted({v for k, v in E.items() if v and len(v) >= 4 and re.search(r"SECRET|KEY|PASSWORD|TOKEN|CLIENT_ID|APP_ID|WEBHOOK|DSN", k)},
                 key=len, reverse=True)

def scrub(s):
    s = str(s)
    for sec in SECRETS:
        s = s.replace(sec, "***")
    return re.sub(r"https?://\S+", "<url>", s)

def out(*a):
    print(scrub(" ".join(str(x) for x in a)), flush=True)

def enabled(name, default="true"):
    return E.get(name, default).strip().lower() in ("true", "1", "yes", "on")

MOCK = os.environ.get("CRE_MOCK_HTTP") == "1"

# ─── Base : transaction en lecture seule ───────────────────────────────────────────────────────
DB = os.environ.get("CRE_DB") or E.get("DB_NAME") or "itic_cre"
PSQL = (json.loads(os.environ["CRE_PSQL"]) if os.environ.get("CRE_PSQL", "").startswith("[")
        else os.environ.get("CRE_PSQL", "sudo -u postgres psql").split())

def sql(q):
    # Séparateurs d'enregistrement et de champ dédiés : un intitulé ou un nom d'entreprise contenant un retour à la
    # ligne ne coupe plus l'enregistrement (cause du plantage du 17/11, ligne 183).
    r = subprocess.run(PSQL + ["-d", DB, "-X", "-q", "-At", "-F", "\x1f", "-R", "\x1e", "-v", "ON_ERROR_STOP=1",
                               "-c", "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY",
                               "-c", "SET statement_timeout = '120s'", "-c", q],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        raise RuntimeError("requête refusée (code %d)" % r.returncode)
    raw = r.stdout[:-1] if r.stdout.endswith("\n") else r.stdout
    return [rec.split("\x1f") for rec in raw.split("\x1e") if rec != ""]

# ─── Dédoublonnage : même règle que CrossSourceDeduplicator (PR #91) ───────────────────────────
INCLUSIVE = re.compile(r"\((?:e|es|ee|ne|le|se|euse|rice|trice|ere|ve)\)")
NON_WORD = re.compile(r"[^a-z0-9]+")

def norm(t):
    if t is None:
        return ""
    n = unicodedata.normalize("NFD", t)
    n = "".join(c for c in n if not unicodedata.combining(c)).lower()
    n = INCLUSIVE.sub("", n)
    return NON_WORD.sub(" ", n).strip()

def city(loc):
    if loc is None:
        return ""
    l = re.sub(r"^\s*\d{2,3}\s*-\s*", "", loc, count=1)
    first = re.split(r"[,(]", l)[0]
    return norm(re.sub(r"\d+", " ", first))

def dedup_key(company, title, location):
    c, t = norm(company or "Entreprise confidentielle"), norm(title)
    if not c or not t:
        return None
    return c + "|" + t + "|" + city(location)

# ─── HTTP : jamais d'URL ni de clé dans la sortie, appels comptés et plafonnés ──────────────────
CALLS = {"FRANCE_TRAVAIL": 0, "BONNE_ALTERNANCE": 0, "ADZUNA": 0, "JSEARCH": 0}
CAP = {"FRANCE_TRAVAIL": 230, "BONNE_ALTERNANCE": 45, "ADZUNA": 85, "JSEARCH": 3}
PAUSE = {"FRANCE_TRAVAIL": 0.15, "BONNE_ALTERNANCE": 0.4, "ADZUNA": 2.6, "JSEARCH": 1.0}
ERRORS = {k: 0 for k in CALLS}

class CapReached(Exception):
    pass

def http(source, method, url, headers=None, data=None):
    if CALLS[source] >= CAP[source]:
        raise CapReached()
    CALLS[source] += 1
    if MOCK:
        return mock_http(source, url, data)
    time.sleep(PAUSE[source])
    for attempt in (1, 2):
        req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                body = r.read()
                return r.status, {k.lower(): v for k, v in r.headers.items()}, (json.loads(body) if body.strip() else None)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 1:
                time.sleep(5)
                continue
            ERRORS[source] += 1
            return e.code, {}, None
        except Exception as e:
            ERRORS[source] += 1
            return -1, {}, type(e).__name__
    return -1, {}, None

# ─── Réponses simulées (tests locaux uniquement) ───────────────────────────────────────────────
def mock_http(source, url, data):
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    if os.environ.get("CRE_MOCK_FAIL") == source:
        raise RuntimeError("échec simulé " + url)  # vérifie que l'URL (et la clé) ne sortent jamais
    if source == "FRANCE_TRAVAIL":
        if "access_token" in url:
            return 200, {}, {"access_token": "jeton-simule"}
        n = 100 + 7 * len("".join(q.get("codeROME", ["x"]))) + (50 if "region" not in q else 0)
        rng = q.get("range", ["0-0"])[0]
        size = 0 if rng == "0-0" else 150
        res = [{"intitule": "Alternant(e) développeur %d" % (i % 40), "entreprise": {"nom": "Ent %d" % (i % 30)},
                "lieuTravail": {"libelle": "75 - PARIS 1%d" % (i % 9)}} for i in range(size)]
        return 206, {"content-range": "offres %s/%d" % (rng, n)}, {"resultats": res}
    if source == "BONNE_ALTERNANCE":
        romes = q.get("romes", [""])[0].split(",")
        jobs = [{"offer": {"title": "Alternant developpeur %d" % (i % 40)}, "workplace": {"name": "Ent %d" % (i % 30),
                 "location": {"address": "Paris 1%d" % (i % 9)}}, "identifier": {"id": str(i)}} for i in range(20 * len(romes))]
        return 200, {}, {"jobs": jobs}
    if source == "ADZUNA":
        per = int(q.get("results_per_page", ["1"])[0])
        res = [{"title": "Alternant développeur %d" % (i % 40), "company": {"display_name": "Ent %d" % (i % 30)},
                "location": {"display_name": "Paris 1%d, Île-de-France" % (i % 9)}} for i in range(per if per > 1 else 0)]
        return 200, {}, {"count": 900 if "where" in q else 4000, "results": res}
    return 200, {}, {"data": [{}] * 10}

# ─── 1. Le CRE aujourd'hui (base, lecture seule) ───────────────────────────────────────────────
out("=" * 78)
out("COMPTAGE DES OFFRES — lecture seule —", time.strftime("%Y-%m-%d %H:%M %Z"))
out("=" * 78)
active = {s: int(n) for s, n in sql("SELECT source, count(*) FROM job_offers WHERE is_active GROUP BY source")}
total_active = sum(active.values())
alt_active = {r[0]: int(r[1]) for r in sql("SELECT o.source, count(*) FROM job_offers o JOIN contract_types c ON c.id = o.contract_type_id "
                                           "WHERE o.is_active AND c.label ILIKE 'alternance%' GROUP BY o.source")}
total_alt = sum(alt_active.values())
out("\n[1] Offres actives dans le CRE aujourd'hui : %d, dont alternance : %d" % (total_active, total_alt))
for s in sorted(active, key=lambda k: -active[k]):
    out("      %-18s %7d   dont alternance %6d" % (s, active[s], alt_active.get(s, 0)))
fresh = {s: (int(a), int(b), int(c)) for s, a, b, c in sql(
    "SELECT source, count(*) FILTER (WHERE created_at > now() - interval '7 days'), "
    "count(*) FILTER (WHERE created_at > now() - interval '30 days'), "
    "count(*) FILTER (WHERE expires_at IS NULL OR expires_at > now()) FROM job_offers WHERE is_active GROUP BY source")}
out("      dont créées depuis 7 j / 30 j / non expirées :")
for s in sorted(fresh):
    out("      %-18s %7d / %7d / %7d" % ((s,) + fresh[s]))
by_contract = sql("SELECT o.source, c.label, count(*) FROM job_offers o JOIN contract_types c ON c.id = o.contract_type_id "
                  "WHERE o.is_active GROUP BY o.source, c.label ORDER BY o.source, count(*) DESC")
out("      par type de contrat :")
for s, label, n in by_contract:
    out("      %-18s %-22s %7s" % (s, label[:22], n))

cfg = {}
for row in sql("SELECT source, enabled, coalesce(rome_codes,''), coalesce(departments,''), coalesce(keywords,''), "
               "coalesce(category,''), coalesce(regions,'') FROM external_source_configs"):
    cfg[row[0]] = dict(enabled=row[1] == "t", romes=[x.strip().upper() for x in row[2].split(",") if x.strip()],
                       departments=row[3].strip(), keywords=[x.strip() for x in row[4].split(",") if x.strip()],
                       categories=[x.strip() for x in row[5].split(",") if x.strip()],
                       regions=[x.strip() for x in row[6].split(",") if x.strip()])
appcfg = dict((k, v) for k, v in sql("SELECT key, value FROM app_configuration WHERE key IN "
                                     "('JOBBOARD_SYNC_MAX_PER_PROVIDER','JOBBOARD_OFFER_EXPIRATION_DAYS')"))
MAX = int(appcfg.get("JOBBOARD_SYNC_MAX_PER_PROVIDER", 10000))
EXP = int(appcfg.get("JOBBOARD_OFFER_EXPIRATION_DAYS", 30))
interval = sql("SELECT coalesce(max(sync_interval_days), 1), bool_or(scheduled_sync_enabled) FROM jobboard_sync_settings")
out("\n    Réglages : plafond par source et par code ROME/catégorie = %d ; expiration = %d j ; synchro tous les %s j (planifiée : %s)"
    % (MAX, EXP, interval[0][0], "oui" if interval[0][1] == "t" else "non"))
for s, c in sorted(cfg.items()):
    out("    Critères %-17s actif=%s  codes ROME=%d  régions=%s  départements/lieu=%s  mots-clés=%d  catégories=%d"
        % (s, "oui" if c["enabled"] else "non", len(c["romes"]), ",".join(c["regions"]) or "(aucune)",
           "(renseigné)" if c["departments"] else "(aucun)", len(c["keywords"]), len(c["categories"])))
logs = sql("SELECT to_char(started_at,'YYYY-MM-DD'), status, inserted_count, skipped_count, expired_count, deleted_count "
           "FROM sync_logs ORDER BY started_at DESC LIMIT 8")
out("    Dernières synchros (date, statut, insérées, ignorées, expirées, supprimées) :")
for r in logs:
    out("      " + "  ".join(r))

known_keys, known_by_source = set(), {}
for src, company, title, loc in sql("SELECT source, company, title, coalesce(location,'') FROM job_offers WHERE is_active"):
    k = dedup_key(company, title, loc)
    if k:
        known_keys.add(k)
        known_by_source.setdefault(src, set()).add(k)

# ─── Critères main et PR #91 ───────────────────────────────────────────────────────────────────
FORMATION_ROMES = ("C1102 C1206 C1501 C1502 C1504 D1214 D1402 D1406 D1408 D1502 D1503 E1101 E1103 I1401 M1101 M1201 "
                   "M1202 M1203 M1206 M1501 M1502 M1503 M1602 M1604 M1607 M1609 M1705 M1801 M1802 M1805 M1810").split()
FAMILIES = {"Dev": "M1805", "Infra": "M1810 I1401 M1801", "Cyber": "M1802 M1810 M1801", "Commerce international": "D1402 M1101",
            "Retail / MCO": "D1502 D1503 D1214", "Relation client / NDRC": "D1402 D1408", "Communication": "E1103 M1705 E1101",
            "Marketing digital": "M1705 E1101", "RH": "M1501 M1502 M1503", "Assistanat / SAM-GPME": "M1604 M1607 M1602",
            "Comptabilité": "M1203 M1206 M1202", "Finance": "M1201 M1206 M1202", "Banque / assurance": "C1206 C1102",
            "Immobilier": "C1504 C1501 C1502", "Santé (secrétariat)": "M1609", "Business": "D1402 D1406"}
IDF_DEPTS = ["75", "77", "78", "91", "92", "93", "94", "95"]
results = {}

def empty_cfg():
    return dict(enabled=True, romes=[], departments="", keywords=[], categories=[], regions=[])

# ─── 2. France Travail ─────────────────────────────────────────────────────────────────────────
FT_BUCKETS = [("E2", None, None, True), ("FS", None, None, True), (None, None, "stage", True),
              (None, "CDI", None, False), (None, "CDD", None, False)]
PRIO_Q = max(1, (MAX * 2 // 3) // 3)
NORM_Q = max(1, (MAX - MAX * 2 // 3) // 2)

def ft():
    out("\n[2] France Travail")
    cid, csec = E.get("FT_CLIENT_ID", ""), E.get("FT_CLIENT_SECRET", "")
    if not enabled("FT_ENABLED") or not cid or not csec:
        out("    clé absente ou source coupée : non mesuré")
        return None
    body = urllib.parse.urlencode({"grant_type": "client_credentials", "client_id": cid, "client_secret": csec,
                                   "scope": "api_offresdemploiv2 o2dsoffre"}).encode()
    st, _, tok = http("FRANCE_TRAVAIL", "POST", "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
                      {"Content-Type": "application/x-www-form-urlencoded"}, body)
    token = tok.get("access_token") if isinstance(tok, dict) else None
    if not token:
        out("    authentification refusée (HTTP %s) : non mesuré" % st)
        return None
    SECRETS.append(token)
    cache = {}

    def total(rome, bucket, regions, rng="0-0"):
        key = (rome, bucket[:3], tuple(regions), rng)
        if key in cache:
            return cache[key]
        params = [("range", rng)]
        if rome:
            params.append(("codeROME", rome))
        if bucket[0]:
            params.append(("natureContrat", bucket[0]))
        if bucket[1]:
            params.append(("typeContrat", bucket[1]))
        if bucket[2]:
            params.append(("motsCles", bucket[2]))
        params += [("region", r) for r in regions]
        st, h, body = http("FRANCE_TRAVAIL", "GET", "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?"
                           + urllib.parse.urlencode(params), {"Authorization": "Bearer " + token, "Accept": "application/json"})
        if st == 204:
            val = (0, [])
        elif st in (200, 206):
            m = re.search(r"/(\d+)", h.get("content-range", ""))
            val = (int(m.group(1)) if m else len((body or {}).get("resultats", [])), (body or {}).get("resultats", []))
        else:
            val = (None, [])
        cache[key] = val
        return val

    c = cfg.get("FRANCE_TRAVAIL", empty_cfg())
    crit = {"main": (c["romes"] or [None], c["regions"]),
            "pr91": (list(dict.fromkeys(c["romes"] + FORMATION_ROMES)), c["regions"] or ["11"])}
    res = {}
    labels = {"E2": "apprentissage (E2)", "FS": "professionnalisation (FS)", "stage": "stage (mot-clé)", "CDI": "CDI", "CDD": "CDD"}
    for name, (romes, regions) in crit.items():
        tot, importable, alt, imp_alt, per_rome = 0, 0, 0, 0, {}
        per_bucket = {k: [0, 0] for k in labels}
        for rome in romes:
            r_tot, r_alt = 0, 0
            for b in FT_BUCKETS:
                try:
                    n, _ = total(rome, b, regions)
                except CapReached:
                    n = None
                if n is None:
                    continue
                q = min(n, PRIO_Q if b[3] else NORM_Q, 1150)
                bk = b[0] or b[1] or b[2]
                per_bucket[bk][0] += n; per_bucket[bk][1] += q
                r_tot += n; importable += q
                if b[0] in ("E2", "FS"):
                    r_alt += n; imp_alt += q
            tot += r_tot; alt += r_alt
            per_rome[rome or "(tous métiers)"] = (r_tot, r_alt)
        importable = min(importable, MAX * len(romes))
        imp_alt = min(imp_alt, importable)
        res[name] = dict(total=tot, alternance=alt, importable=importable, importable_alt=imp_alt, per_rome=per_rome,
                         romes=len(romes), zone=",".join(regions) or "France entière")
        out("    %-5s : %d code(s) ROME, zone %s → %d offres, dont alternance (E2+FS) %d ; importables par synchro ≈ %d, dont alternance ≈ %d"
            % (name, len([r for r in romes if r]), res[name]["zone"], tot, alt, importable, imp_alt))
        out("            détail des 5 recherches de la synchro (disponibles / importables par synchro) :")
        for bk, (n, q) in per_bucket.items():
            out("              %-27s %7d / %7d" % (labels[bk], n, q))
    out("    (total = somme des 5 recherches ; une offre peut compter 2 fois, ex. alternance en CDD trouvée aussi par la recherche CDD)")
    out("    ⚠ Dans le CRE, le type de contrat d'une offre France Travail est déduit de son INTITULÉ (alternance, alternant, apprenti,")
    out("      professionnalisation) : une offre trouvée par la recherche E2/FS sans ces mots est enregistrée en CDD ou CDI.")
    out("    Détail PR #91 par code ROME (toutes recherches / alternance) :")
    for rome, (t, a) in sorted(res["pr91"]["per_rome"].items(), key=lambda kv: -kv[1][0]):
        out("      %-6s %6d / %6d" % (rome, t, a))
    sample = []
    for rome in ("M1805", "D1402", "M1501", "M1203"):
        try:
            _, rows = total(rome, FT_BUCKETS[0], crit["pr91"][1], "0-149")
        except CapReached:
            rows = []
        sample += [dedup_key((o.get("entreprise") or {}).get("nom"), o.get("intitule"), (o.get("lieuTravail") or {}).get("libelle"))
                   for o in rows]
    res["sample"] = [k for k in sample if k]
    return res

# ─── 3. La Bonne Alternance ────────────────────────────────────────────────────────────────────
def lba():
    out("\n[3] La Bonne Alternance")
    key = E.get("LBA_API_KEY", "")
    if not enabled("LBA_ENABLED") or not key:
        out("    clé absente ou source coupée : non mesuré")
        return None
    excl = E.get("LBA_PARTNERS_TO_EXCLUDE", "Indeed")
    if enabled("FT_ENABLED") and E.get("FT_CLIENT_ID") and "France Travail" not in excl:
        excl += ",France Travail"

    def search(romes, depts):
        params = [("caller", "ITIC"), ("partners_to_exclude", excl)]
        if romes:
            params.append(("romes", ",".join(romes)))
        params += [("departements", d) for d in depts]
        try:
            st, _, body = http("BONNE_ALTERNANCE", "GET", "https://api.apprentissage.beta.gouv.fr/api/job/v1/search?"
                               + urllib.parse.urlencode(params), {"Authorization": "Bearer " + key, "Accept": "application/json"})
        except CapReached:
            return None
        return (body or {}).get("jobs") if st == 200 and isinstance(body, dict) else None

    c = cfg.get("BONNE_ALTERNANCE", empty_cfg())
    depts_main = [x.strip() for x in c["departments"].split(",") if x.strip()]
    res = {}
    jobs = search(c["romes"], depts_main)
    n_main = len(jobs) if jobs is not None else None
    res["main"] = dict(total=n_main, alternance=n_main, importable=min(n_main or 0, MAX), importable_alt=min(n_main or 0, MAX))
    out("    main  : %d code(s) ROME, zone %s → %s offres renvoyées (1 appel)"
        % (len(c["romes"]), ",".join(depts_main) or "France entière", n_main))
    romes91 = list(dict.fromkeys(c["romes"] + FORMATION_ROMES))
    depts91 = depts_main or IDF_DEPTS
    seen, n91, imp = set(), 0, 0
    for i in range(0, len(romes91), 10):
        jobs = search(romes91[i:i + 10], depts91) or []
        ids = {(j.get("identifier") or {}).get("id") for j in jobs}
        n91 += len(ids - seen); imp += min(len(ids - seen), MAX); seen |= ids
    res["pr91"] = dict(total=n91, alternance=n91, importable=imp, importable_alt=imp)
    out("    (La Bonne Alternance ne renvoie que de l'alternance : total = alternance ; pas de total dans l'API, on compte les offres renvoyées)")
    out("    pr91  : %d codes ROME par paquets de 10, zone %s → %d offres distinctes" % (len(romes91), "IDF (8 dép.)"
        if not depts_main else ",".join(depts_main), n91))
    out("    Détail PR #91 par code ROME (offres renvoyées) :")
    per, sample = {}, []
    for rome in FORMATION_ROMES:
        jobs = search([rome], depts91)
        per[rome] = len(jobs) if jobs is not None else None
        for j in jobs or []:
            sample.append(dedup_key((j.get("workplace") or {}).get("name"), (j.get("offer") or {}).get("title"),
                                    ((j.get("workplace") or {}).get("location") or {}).get("address")))
    for rome, n in sorted(per.items(), key=lambda kv: -(kv[1] or 0)):
        out("      %-6s %6s" % (rome, n))
    res["per_rome"] = per
    res["sample"] = [k for k in sample if k]
    res["capped"] = max([v for v in per.values() if v] or [0])
    return res

# ─── 4. Adzuna ─────────────────────────────────────────────────────────────────────────────────
def adzuna():
    out("\n[4] Adzuna")
    app_id, key = E.get("ADZUNA_APP_ID", ""), E.get("ADZUNA_API_KEY", "")
    if not enabled("ADZUNA_ENABLED") or not app_id or not key:
        out("    clé absente ou source coupée : non mesuré")
        return None
    cache = {}

    def count(what, category, where, permanent, per_page=1, what_or=None):
        k = (what, category, where, permanent, per_page, what_or)
        if k in cache:
            return cache[k]
        params = [("app_id", app_id), ("app_key", key), ("results_per_page", per_page), ("sort_by", "date")]
        if what:
            params.append(("what", what))
        if what_or:
            params.append(("what_or", what_or))
        if category:
            params.append(("category", category))
        if where:
            params.append(("where", where))
        if permanent:
            params.append(("permanent", "1"))
        try:
            st, _, body = http("ADZUNA", "GET", "https://api.adzuna.com/v1/api/jobs/fr/search/1?" + urllib.parse.urlencode(params),
                               {"Accept": "application/json"})
        except CapReached:
            return (None, [])
        val = (body.get("count"), body.get("results", [])) if st == 200 and isinstance(body, dict) else (None, [])
        cache[k] = val
        return val

    c = cfg.get("ADZUNA", empty_cfg())
    guaranteed = ["stage", "alternance", "apprentissage", "professionnalisation"]
    configured = c["keywords"] or [None]
    loop = [(g, False, True) for g in guaranteed if not any((q or "").lower() == g for q in configured)]
    loop.append((None, True, False))
    loop += [(q, False, (q or "").lower() in guaranteed) for q in configured]
    prio_n = sum(1 for x in loop if x[2]); norm_n = len(loop) - prio_n
    pq = max(1, (MAX * 2 // 3) // prio_n) if prio_n else 0
    nq = max(1, (MAX - MAX * 2 // 3) // norm_n) if norm_n else 0
    res = {}
    for name, where in (("main", c["departments"] or None), ("pr91", c["departments"] or "Ile-de-France")):
        tot, imp, imp_alt = 0, 0, 0
        for cat in (c["categories"] or [None]):
            for what, perm, prio in loop:
                n, _ = count(what, cat, where, perm)
                if n is None:
                    continue
                q = min(n, pq if prio else nq, 1000)
                tot += n; imp += q
                if what in ("alternance", "apprentissage", "professionnalisation"):
                    imp_alt += q
        imp = min(imp, MAX * len(c["categories"] or [None]))
        alt_n, _ = count(None, None, where, False, 1, what_or="alternance alternant apprenti apprentissage professionnalisation")
        imp_alt = min(imp_alt, alt_n if alt_n is not None else imp_alt, imp)
        res[name] = dict(total=tot, alternance=alt_n, importable=imp, importable_alt=imp_alt, zone=where or "France entière")
        out("    %-5s : zone %s, %d recherche(s) × %d catégorie(s) → %d offres (somme des recherches) ; importables par synchro ≈ %d"
            % (name, "(lieu renseigné)" if c["departments"] else (where or "France entière"), len(loop),
               len(c["categories"] or [None]), tot, imp))
        out("            alternance : %s offres distinctes contenant un mot d'alternance (toutes catégories) ; importables ≈ %d"
            % (alt_n, imp_alt))
    if c["departments"]:
        out("    (lieu déjà renseigné dans les critères : la PR #91 ne change rien pour Adzuna, qui n'utilise pas les codes ROME)")
    _, rows = count("alternance", None, "Ile-de-France", False, 50)
    res["sample"] = [k for k in (dedup_key((o.get("company") or {}).get("display_name"), o.get("title"),
                                           (o.get("location") or {}).get("display_name")) for o in rows) if k]
    return res

# ─── 5. JSearch (seulement si une clé existe déjà) ─────────────────────────────────────────────
def jsearch():
    out("\n[5] JSearch")
    key = E.get("JOBBOARD_JSEARCH_API_KEY", "")
    if not key:
        out("    non mesuré, pas de clé")
        return None
    n_tot = 0
    for q in ("alternance Île-de-France", "stage Île-de-France"):
        try:
            st, _, body = http("JSEARCH", "GET", "https://jsearch.p.rapidapi.com/search?" + urllib.parse.urlencode(
                {"query": q, "page": 1, "num_pages": 1, "country": "fr", "language": "fr", "date_posted": "week"}),
                {"X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"})
        except CapReached:
            break
        n = len((body or {}).get("data", [])) if st == 200 and isinstance(body, dict) else None
        out("    « %s » : %s offre(s) sur la 1re page (JSearch ne renvoie pas de total)" % (q, n))
        n_tot += n or 0
    return dict(first_pages=n_tot)

R = {}
for name, fn in (("FRANCE_TRAVAIL", ft), ("BONNE_ALTERNANCE", lba), ("ADZUNA", adzuna), ("JSEARCH", jsearch)):
    try:
        R[name] = fn()
    except Exception as e:
        out("    erreur pendant la mesure (%s) : source non mesurée" % type(e).__name__)
        R[name] = None

# ─── 6. Dédoublonnage estimé sur échantillon ───────────────────────────────────────────────────
out("\n[6] Dédoublonnage — ESTIMATION sur échantillon (règle entreprise + intitulé + ville de la PR #91)")
samples = {s: R[s]["sample"] for s in ("FRANCE_TRAVAIL", "BONNE_ALTERNANCE", "ADZUNA") if R.get(s) and R[s].get("sample")}
dup_rates = {}
ORDER = ["ADZUNA", "FRANCE_TRAVAIL", "BONNE_ALTERNANCE"]  # ordre de la synchro (beans Spring, ordre alphabétique des classes)
prior = set()
for s in ORDER:
    keys = samples.get(s)
    if not keys:
        continue
    db_others = set().union(*[ks for src, ks in known_by_source.items() if src != s]) if known_by_source else set()
    already = sum(1 for k in keys if k in known_keys)
    dup = sum(1 for k in keys if k in prior or k in db_others)
    internal = len(keys) - len(set(keys))
    dup_rates[s] = dup / len(keys)
    out("    %-17s échantillon %4d offres : déjà dans le CRE %3d%% ; écartées comme doublon d'une autre source %3d%% ; doublons internes %d"
        % (s, len(keys), round(100 * already / len(keys)), round(100 * dup_rates[s]), internal))
    prior |= set(keys)
out("    Ordre de la synchro : Adzuna, puis France Travail, puis La Bonne Alternance — une offre n'est écartée que si une source "
    "traitée avant elle (ou une offre déjà en base d'une autre source) l'a déjà.")
out("    Échantillon : France Travail = 4 × 150 (alternance E2, ROME M1805, D1402, M1501, M1203, IDF) ; "
    "LBA = toutes les réponses par code ROME ; Adzuna = 50 offres « alternance » en IDF.")

# ─── 7. Tableau final ──────────────────────────────────────────────────────────────────────────
out("\n" + "=" * 78)
out("TABLEAU (nombres seulement)")
out("=" * 78)
out("Offres actives dans le CRE aujourd'hui : %d au total, dont %d en alternance" % (total_active, total_alt))
out("Chaque case : TOTAL / ALTERNANCE")
H = "%-17s %17s %17s %19s %19s %6s"
out(H % ("source", "dispo main", "dispo PR #91", "import./synchro #91", "après dédoublonnage", "appels"))
est_total, est_alt = 0, 0
def pair(a, b):
    return "%s / %s" % ("?" if a is None else a, "?" if b is None else b)
for s in ("FRANCE_TRAVAIL", "BONNE_ALTERNANCE", "ADZUNA"):
    r = R.get(s)
    if not r:
        out(H % (s, "non mesuré", "non mesuré", "-", "-", CALLS[s]))
        continue
    p91 = r["pr91"]
    rate = dup_rates.get(s, 0)
    after, after_alt = round(p91["importable"] * (1 - rate)), round(p91["importable_alt"] * (1 - rate))
    est_total += after; est_alt += after_alt
    out(H % (s, pair(r["main"]["total"], r["main"].get("alternance")), pair(p91["total"], p91.get("alternance")),
             pair(p91["importable"], p91["importable_alt"]), pair(after, after_alt), CALLS[s]))
out(H % ("JSEARCH", "coupé", str((R["JSEARCH"] or {}).get("first_pages", "pas de clé")), "-", "-", CALLS["JSEARCH"]))
out("Estimé importable par synchro après dédoublonnage (hors offres ITIC) : %d au total, dont %d en alternance" % (est_total, est_alt))
out("(« alternance » côté API = recherches E2/FS pour France Travail, tout LBA, mots d'alternance pour Adzuna ; côté CRE = libellé déduit de l'intitulé)")
for s in CALLS:
    if CALLS[s] >= CAP[s]:
        out("ATTENTION %s : plafond de %d appels atteint, mesure INCOMPLÈTE (chiffres sous-estimés)" % (s, CAP[s]))
out("Appels en erreur : " + ", ".join("%s=%d" % kv for kv in ERRORS.items()))
out("Fin. Rien n'a été écrit, ni en base ni sur le disque.")
PY
