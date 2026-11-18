"""Non-régression (lot 9) : rejoue les ÉCRITURES des parcours existants (ceux de main) pour chaque rôle, et note le
résultat de chaque étape (code HTTP, e-mails partis vers la boîte de capture locale). Lancé sur main puis sur la branche
finale, chacune sur sa copie de la même base jetable : les deux relevés doivent être identiques.

Usage : python api_journeys.py <url_api> <fichier_sortie.json> <dossier_boite_capture>
        python api_journeys.py --compare <main.json> <final.json>
Aucune donnée réelle : comptes et contenus fictifs (example.test).
"""
import json
import sys
import time
from pathlib import Path

import requests

PASSWORD = "NonReg-2026!"
PDF = Path(__file__).resolve().parents[2] / "docs" / "cv-samples" / "classique-1-page.pdf"


class Client:
    def __init__(self, api, email=None, password=PASSWORD):
        self.api, self.s = api, requests.Session()
        if email:
            r = self.s.post(f"{api}/auth/login", json={"email": email, "password": password}, timeout=60)
            r.raise_for_status()

    def call(self, method, path, **kw):
        return self.s.request(method, f"{self.api}{path}", timeout=120, **kw)


def data(r):
    try:
        return r.json().get("data")
    except Exception:
        return None


def run(api, out, mailbox):
    mailbox = Path(mailbox)
    steps = []

    def step(name, r, keep=None, expect_mail_to=None):
        mails = []
        if expect_mail_to:
            time.sleep(2.5)
            mails = sorted(f.name.split("-", 2)[-1] for f in mailbox.glob(f"*{expect_mail_to}*") if f.stat().st_mtime > started)
        steps.append({"step": name, "status": r.status_code, "keep": keep, "mail": bool(mails) if expect_mail_to else None})
        print(f"{r.status_code}  {name}" + (f"  (e-mail : {'oui' if mails else 'NON'})" if expect_mail_to else ""))
        return r

    started = time.time()
    anon = Client(api)
    step("connexion avec un mauvais mot de passe", anon.call("POST", "/auth/login", json={"email": "nonreg.etudiant2@example.test", "password": "faux"}))
    email = f"nonreg.inscription{int(started)}@example.test"
    step("inscription d'un étudiant (code par e-mail)", anon.call("POST", "/auth/register", json={
        "email": email, "firstName": "Nouvel", "lastName": "Inscrit", "password": PASSWORD, "privacyAccepted": True, "lang": "fr"}),
        expect_mail_to=email)

    adm = Client(api, "nonreg.equipe13@example.test")
    adv = Client(api, "nonreg.equipe1@example.test")
    st = Client(api, "nonreg.etudiant2@example.test")
    empty = Client(api, "nonreg.etudiant38@example.test")   # sans promotion, sans CV
    statuses = data(adv.call("GET", "/application-statuses"))
    contracts = data(adv.call("GET", "/jobboard/contract-types/active/list"))
    contract_id = contracts[0]["id"]
    first_status = sorted(statuses, key=lambda s: s.get("ordre", 0))[0]["id"]
    next_status = sorted(statuses, key=lambda s: s.get("ordre", 0))[1]["id"]

    step("étudiant : modifier son profil (téléphone)", st.call("PUT", "/auth/users/me", json={"phoneNumber": "0612345678"}))
    r = step("étudiant : créer une candidature", st.call("POST", "/applications", json={
        "entreprise": "Entreprise fictive NR", "poste": "Alternant RH", "typeContratId": contract_id, "lienOffre": "https://example.test/a"}))
    app_id = (data(r) or {}).get("id")
    step("étudiant : changer le statut de sa candidature", st.call("PATCH", f"/applications/{app_id}/status", json={"statusId": next_status}))
    step("étudiant : modifier sa candidature", st.call("PUT", f"/applications/{app_id}", json={
        "entreprise": "Entreprise fictive NR", "poste": "Alternant RH (modifié)", "typeContratId": contract_id}))
    offers = data(st.call("GET", "/jobboard/offers?size=5"))["content"]
    offer_id = offers[0]["id"]
    step("étudiant : postuler à une offre du jobboard", st.call("POST", f"/jobboard/applications/{offer_id}/apply"))
    mine = data(st.call("GET", "/jobboard/applications/my-applications")) or []
    mine = mine["content"] if isinstance(mine, dict) else mine
    ja = next((a["id"] for a in mine if a.get("jobOfferId") == offer_id), None)
    step("étudiant : retirer sa candidature jobboard", st.call("DELETE", f"/jobboard/applications/{ja}/withdraw"))
    step("étudiant sans CV : lire « Mon CV » (état vide)", empty.call("GET", "/cv/me"))
    with open(PDF, "rb") as f:
        step("étudiant sans CV : déposer un CV (PDF)", empty.call("POST", "/cv/me/upload", files={"file": ("cv.pdf", f, "application/pdf")}))
    r = step("étudiant : relire son CV déposé", empty.call("GET", "/cv/me"))
    cv_id = (data(r) or {}).get("id")
    step("étudiant : déclarer un contrat", empty.call("POST", "/applications/declare-contract", json={
        "entreprise": "Entreprise fictive NR", "poste": "Alternant", "contractTypeId": contract_id, "startDate": "2026-11-02"}))
    step("étudiant : envoyer une demande d'aide", st.call("POST", "/reclamations", json={"message": "Demande fictive de non-régression"}))
    step("étudiant : export RGPD", st.call("GET", "/gdpr/export"))

    statuts = data(adv.call("GET", "/cv/statuts"))
    step("conseiller : commenter un CV", adv.call("POST", f"/cv/{cv_id}/comments", json={"contenu": "Commentaire fictif"}))
    step("conseiller : changer le statut d'un CV", adv.call("PUT", f"/cv/{cv_id}/status", json={"statutId": statuts[-1]["id"]}))
    r = step("conseiller : publier une offre", adv.call("POST", "/jobboard/offers", json={
        "title": "Offre fictive de non-régression", "company": "Entreprise fictive NR", "description": "Postuler : rh@example.test",
        "location": "75011 Paris", "contractTypeId": contract_id}))
    new_offer = (data(r) or {}).get("id")
    step("conseiller : modifier l'offre", adv.call("PUT", f"/jobboard/offers/{new_offer}", json={
        "title": "Offre fictive de non-régression (modifiée)", "company": "Entreprise fictive NR",
        "description": "Postuler : rh@example.test", "contractTypeId": contract_id}))
    step("conseiller : désactiver l'offre", adv.call("PUT", f"/jobboard/offers/{new_offer}/deactivate"))
    step("conseiller : réactiver l'offre", adv.call("PUT", f"/jobboard/offers/{new_offer}/activate"))
    target = data(adv.call("GET", "/dashboard/students?size=1&search=nonreg.etudiant5@"))["content"][0]["id"]
    step("conseiller : envoyer un message à un étudiant", adv.call("POST", f"/dashboard/students/{target}/notify",
                                                                 json={"message": "Message fictif"}), expect_mail_to="nonreg.etudiant5@")
    step("conseiller : noter un étudiant (étoiles)", adv.call("PATCH", f"/dashboard/students/{target}/star-rating", json={"starRating": 2}))
    step("conseiller : déclarer un contrat pour un étudiant", adv.call("POST", f"/dashboard/students/{target}/declare-contract", json={
        "entreprise": "Entreprise fictive NR", "poste": "Alternant", "contractTypeId": contract_id, "startDate": "2026-11-02"}))
    step("conseiller : désactiver un étudiant", adv.call("PATCH", f"/auth/users/{target}/deactivate"))
    step("conseiller : réactiver l'étudiant (e-mail)", adv.call("PATCH", f"/auth/users/{target}/reactivate"), expect_mail_to="nonreg.etudiant5@")
    recl = data(adv.call("GET", "/dashboard/reclamations?size=1"))
    recl_id = recl["content"][0]["id"] if recl and recl.get("content") else None
    step("conseiller : traiter une demande d'aide", adv.call("PATCH", f"/dashboard/reclamations/{recl_id}/resolve"))
    step("conseiller : export CSV des candidatures", adv.call("GET", "/dashboard/applications/export"))

    staff_email = f"nonreg.nouveau{int(started)}@example.test"
    r = step("admin : créer un compte conseiller (identifiants par e-mail)", adm.call("POST", "/auth/admin/users", json={
        "email": staff_email, "firstName": "Nouveau", "lastName": "Conseiller", "role": "ADVISOR", "password": "Temporaire123!"}),
        expect_mail_to=staff_email)
    staff_id = (data(r) or {}).get("id")
    step("admin : « supprimer » ce conseiller (ancien bouton)", adm.call("DELETE", f"/auth/users/{staff_id}"))
    step("admin : journal d'audit", adm.call("GET", "/auth/admin/audit-logs?size=5"))
    step("étudiant : se déconnecter", st.call("POST", "/auth/logout"))
    Path(out).write_text(json.dumps(steps, ensure_ascii=False, indent=1), encoding="utf-8")


def compare(a_path, b_path):
    a = json.loads(Path(a_path).read_text(encoding="utf-8"))
    b = {s["step"]: s for s in json.loads(Path(b_path).read_text(encoding="utf-8"))}
    same = 0
    for s in a:
        t = b.get(s["step"])
        if t and t["status"] == s["status"] and t["mail"] == s["mail"]:
            same += 1
        else:
            print(f"DIFFÉRENT : {s['step']} — main {s['status']}/{s['mail']} ; finale {t and t['status']}/{t and t['mail']}")
    print(f"{same}/{len(a)} étapes identiques")


if __name__ == "__main__":
    if sys.argv[1] == "--compare":
        compare(sys.argv[2], sys.argv[3])
    else:
        run(sys.argv[1], sys.argv[2], sys.argv[3])
