"""Non-régression (lot 9) : envois automatiques et Espace entreprise selon les interrupteurs.
Phase « defauts » : état réel du lendemain du déploiement (aucune variable), crons accélérés pour ne pas attendre 18 h /
lundi 8 h. Phase « allumes » : APP_MAILING_WEEKLY_DIGEST_ENABLED=true et APP_MAILING_INSTANT_OFFERS_ENABLED=true.
Usage : python switches_check.py <url_api> <dossier_boite_capture> defauts|allumes
Ne lit que la boîte de capture LOCALE (aucun vrai mail) ; comptes fictifs du jeu de non-régression."""
import email
import email.policy
import sys
import time
from pathlib import Path

import requests

API, BOX, PHASE = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
PASSWORD = "NonReg-2026!"
ok_all = []


def check(label, ok, detail=""):
    ok_all.append(ok)
    print(("OK   " if ok else "ECHEC") + f" {label}" + (f" — {detail}" if detail else ""))


def login(mail):
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"email": mail, "password": PASSWORD}, timeout=60).raise_for_status()
    return s


def subjects_since(t0):
    out = []
    for f in BOX.glob("*"):
        if f.stat().st_mtime >= t0:
            m = email.message_from_bytes(f.read_bytes(), policy=email.policy.default)
            out.append(str(m["Subject"]))
    return out


adv = login("nonreg.equipe1@example.test")
adm = login("nonreg.equipe13@example.test")
contract = adv.get(f"{API}/jobboard/contract-types/active/list").json()["data"][0]["id"]
programs = adv.get(f"{API}/company-space/programs").json()["data"]
rh = next(p["id"] for p in programs if p["slug"] == "bach-rh")
promo = next(p["id"] for p in adv.get(f"{API}/promotions").json()["data"] if p["name"] == "Bachelor RH 2025-2026")
t0 = time.time()
r = adv.post(f"{API}/jobboard/offers", json={
    "title": f"Offre fictive interrupteurs {PHASE}", "company": "Entreprise fictive NR", "description": "Postuler : rh@example.test",
    "location": "75011 Paris", "contractTypeId": contract, "programIds": [rh], "targetPromotionIds": [promo]})
check("offre publiée avec une formation et une promotion ciblée", r.status_code == 201, str(r.status_code))
offer = r.json()["data"]["id"]
time.sleep(1)
queued = adm.get(f"{API}/jobboard/offers/{offer}/alert-recipients").json()["data"]
print(f"     destinataires possibles de l'alerte : {queued['count']} (alertes {'activées' if queued['alertsEnabled'] else 'coupées'})")

print("     attente de 2 passages des envois planifiés (2 min 10)…")
time.sleep(130)
subjects = subjects_since(t0)
evening = [s for s in subjects if "promotion" in s.lower()]
weekly = [s for s in subjects if "semaine" in s.lower() or "lundi" in s.lower() or "week" in s.lower()]
alerts = [s for s in subjects if "pour ta formation" in s]
check("e-mail du soir (offres ciblées) : actif par défaut, parti pour la promotion ciblée", len(evening) > 0, f"{len(evening)} e-mail(s)")
if PHASE == "defauts":
    check("récapitulatif du lundi : COUPÉ par défaut (aucun e-mail malgré le cron accéléré)", len(weekly) == 0, f"{len(weekly)}")
    check("alertes instantanées : COUPÉES par défaut (aucun e-mail, aucune file)", len(alerts) == 0 and not queued["alertsEnabled"], f"{len(alerts)}")
    r = requests.get(f"{API}/public/entreprise/annuaire", timeout=60)
    check("Espace entreprise : FERMÉ par défaut (404 sans la clé)", r.status_code == 404, str(r.status_code))
else:
    check("récapitulatif du lundi : allumé, e-mails partis", len(weekly) > 0, f"{len(weekly)} e-mail(s)")
    check("alertes instantanées : allumées, e-mails partis", len(alerts) > 0, f"{len(alerts)} e-mail(s)")
    s = adm.get(f"{API}/company-space/settings").json()["data"]
    s["privateAccess"] = False
    r = adm.put(f"{API}/company-space/settings", json=s)
    check("Espace entreprise : ouvert par l'admin depuis le back-office", r.status_code in (200, 204), str(r.status_code))
    r = requests.get(f"{API}/public/entreprise/annuaire", timeout=60)
    check("Espace entreprise : annuaire public accessible (200)", r.status_code == 200, str(r.status_code))
print(f"\n{sum(ok_all)}/{len(ok_all)} vérifications OK")
