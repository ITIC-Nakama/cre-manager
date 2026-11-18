"""Non-régression (lot 9) : photographie toutes les LECTURES de l'API existante (celles de main) pour chaque rôle, sur la
base jetable de non-régression, afin de comparer main et la branche finale sur les mêmes données.

Usage :
  python api_snapshot.py <url_api> <dossier_sortie>            # ex. http://localhost:8090/api/v1 out/main
  python api_snapshot.py --compare <dossier_main> <dossier_final> # rapport des différences

Comptes : ceux de generate_dataset.sql (mot de passe fictif commun). Aucune écriture : GET seulement.
Comparaison : statut HTTP identique ; tout champ présent dans main doit exister dans la branche finale avec la même valeur
(les champs AJOUTÉS par la branche finale sont permis). Les listes doivent garder la même longueur et le même ordre.
"""
import json
import sys
from pathlib import Path

import requests

PASSWORD = "NonReg-2026!"
ACCOUNTS = {
    "admin": "nonreg.equipe13@example.test",
    "conseiller": "nonreg.equipe1@example.test",
    "etudiant_cv": "nonreg.etudiant1@example.test",       # promotion, CV déposé, candidatures
    "etudiant_vide": "nonreg.etudiant19@example.test",    # sans promotion, sans CV
    "etudiant_en": "nonreg.etudiant9@example.test",       # langue anglaise
}
# Lectures communes et par rôle (chemins de main ; {x} remplacés par des identifiants trouvés à la volée).
STAFF = [
    "/auth/users/me", "/promotions", "/promotions/available-years", "/jobboard/sectors", "/jobboard/sectors/active/list",
    "/jobboard/contract-types", "/jobboard/contract-types/active/list", "/application-statuses", "/cv/statuts", "/cv/statuts/all",
    "/jobboard/offers?size=50", "/jobboard/offers?size=20&source=EXTERNAL", "/jobboard/offers?search=recrutement&size=20",
    "/jobboard/offers/all?size=50", "/jobboard/offers/all?size=50&source=ALL&active=true",
    "/jobboard/offers/all?size=20&sort=title,asc", "/jobboard/offers/all?size=20&postedBy=EXTERNAL&source=ALL",
    "/jobboard/offers/all?size=20&noApplyChannel=true&source=ALL", "/jobboard/offers/authors",
    "/jobboard/offers/search/title?title=Chargé", "/jobboard/offers/search/company?company=Entreprise",
    "/dashboard/overview", "/dashboard/promotions", "/dashboard/promotions/student-counts",
    "/dashboard/students?size=50", "/dashboard/students?size=50&sort=lastName,asc", "/dashboard/students?size=50&underContract=false",
    "/dashboard/students?size=50&isActive=false", "/dashboard/students?size=50&hasCv=true", "/dashboard/students?size=20&search=Lina",
    "/dashboard/students?size=20&accountActive=false", "/dashboard/students/needing-attention", "/dashboard/stale-applications",
    "/dashboard/applications?size=50", "/dashboard/applications?size=50&stale=true",
    "/dashboard/applications/grouped-by-student?size=30", "/dashboard/applications/grouped-by-student?size=30&underContract=true",
    "/dashboard/applications/pending-contract-count", "/dashboard/reclamations?size=30", "/dashboard/reclamations/pending-count",
    "/dashboard/reclamations/pending-count-mine", "/dashboard/reclamations/pending-count-outside-mine", "/dashboard/cv/pending-count",
    "/dashboard/alumni", "/dashboard/alumni/exit-years", "/cv?size=50", "/cv/stats", "/advisors", "/advisors/directory", "/advisors/all",
    "/api/skill-tree/categories", "/api/admin/skill-tree/categories", "/api/admin/skill-tree/articles",
    "/api/admin/gamification/grades", "/dashboard/applications/export",
    "/jobboard/offers/{offer}", "/jobboard/applications/offer/{offer}", "/jobboard/applications/offer/{offer}/count",
    "/dashboard/students/{student}", "/dashboard/students/{student}/row", "/cv/student/{student}", "/cv/{cv}/comments",
    "/promotions/{promotion}", "/dashboard/promotions/{promotion}/year-counts",
]
ADMIN_ONLY = ["/auth/roles", "/auth/admin/governance", "/auth/admin/audit-logs?size=20", "/api/admin/gamification/configs",
              "/api/admin/app-config", "/jobboard/admin/external/stats", "/dashboard/students/all"]
STUDENT = [
    "/auth/users/me", "/applications", "/jobboard/offers?size=50", "/jobboard/offers?size=20&source=EXTERNAL",
    "/jobboard/applications/my-applications", "/cv/me", "/cv/me/comments", "/cv/builder/me", "/cv/builder/me/score",
    "/reclamations", "/reclamations/form-context", "/api/skill-tree/progress", "/api/skill-tree/categories",
    "/api/me/gamification/xp-history", "/api/me/gamification/level-up", "/api/me/gamification/grade",
    "/api/me/dashboard/summary", "/advisors/directory", "/gdpr/export", "/jobboard/offers/{offer}", "/promotions",
    "/jobboard/sectors/active/list", "/jobboard/contract-types/active/list", "/application-statuses",
]
# Champs qui changent d'un appel à l'autre sans rapport avec le code (horodatages calculés, liens signés).
VOLATILE = {"generatedAt", "exportedAt", "token", "expiresAt", "url", "profilePicture", "fileUrl", "downloadUrl", "lastActivity"}


def login(api, email):
    s = requests.Session()
    r = s.post(f"{api}/auth/login", json={"email": email, "password": PASSWORD}, timeout=60)
    r.raise_for_status()
    return s


def ids(api, session):
    """Identifiants réels pris dans la base (mêmes pour main et la branche finale)."""
    out = {}
    offers = session.get(f"{api}/jobboard/offers/all?size=5&source=ALL&sort=createdAt,desc", timeout=60).json()["data"]["content"]
    out["offer"] = offers[0]["id"]
    students = session.get(f"{api}/dashboard/students?size=5&hasCv=true&sort=lastName,asc", timeout=60).json()["data"]["content"]
    out["student"] = students[0]["id"]
    cv = session.get(f"{api}/cv/student/{out['student']}", timeout=60)
    out["cv"] = cv.json()["data"]["id"] if cv.status_code == 200 and cv.json().get("data") else None
    promos = session.get(f"{api}/promotions", timeout=60).json()["data"]
    promos = promos["content"] if isinstance(promos, dict) else promos
    out["promotion"] = sorted(promos, key=lambda p: p["name"])[0]["id"]
    return out


def snapshot(api, outdir):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    admin = login(api, ACCOUNTS["admin"])
    known = ids(api, admin)
    (outdir / "_ids.json").write_text(json.dumps(known, indent=1), encoding="utf-8")
    plan = [("admin", p) for p in STAFF + ADMIN_ONLY] + [("conseiller", p) for p in STAFF]
    plan += [(role, p) for role in ("etudiant_cv", "etudiant_vide", "etudiant_en") for p in STUDENT]
    sessions = {"admin": admin}
    n = 0
    for role, path in plan:
        if role not in sessions:
            sessions[role] = login(api, ACCOUNTS[role])
        url = path.format(**known)
        r = sessions[role].get(f"{api}{url}", timeout=120)
        ctype = r.headers.get("Content-Type", "")
        body = None if not r.content else r.json() if "json" in ctype else {"_bytes": len(r.content), "_type": ctype.split(";")[0],
                                                  "_lines": r.text.count("\n") if "csv" in ctype or "text" in ctype else None}
        name = f"{role}__{path}".replace("/", "_").replace("?", "__").replace("&", "_").replace("=", "-").replace("{", "").replace("}", "")
        (outdir / f"{name[:180]}.json").write_text(json.dumps({"role": role, "path": url, "status": r.status_code, "body": body},
                                                              ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        n += 1
    print(f"{n} lectures enregistrées dans {outdir}")


def diff(a, b, where, out):
    if isinstance(a, dict):
        if not isinstance(b, dict):
            out.append(f"{where}: objet devenu {type(b).__name__}")
            return
        for k, v in a.items():
            if k in VOLATILE:
                continue
            if k not in b:
                out.append(f"{where}.{k}: champ SUPPRIMÉ")
            else:
                diff(v, b[k], f"{where}.{k}", out)
    elif isinstance(a, list):
        if not isinstance(b, list):
            out.append(f"{where}: liste devenue {type(b).__name__}")
            return
        if len(a) != len(b):
            out.append(f"{where}: {len(a)} éléments dans main, {len(b)} dans la branche finale")
        for i, (x, y) in enumerate(zip(a, b)):
            diff(x, y, f"{where}[{i}]", out)
    elif a != b:
        out.append(f"{where}: {json.dumps(a, ensure_ascii=False)[:80]} → {json.dumps(b, ensure_ascii=False)[:80]}")


def compare(main_dir, final_dir):
    report, same = [], 0
    for f in sorted(Path(main_dir).glob("*.json")):
        if f.name.startswith("_"):
            continue
        g = Path(final_dir) / f.name
        a = json.loads(f.read_text(encoding="utf-8"))
        if not g.exists():
            report.append(f"## {a['role']} GET {a['path']}\n- absent de la branche finale")
            continue
        b = json.loads(g.read_text(encoding="utf-8"))
        out = []
        if a["status"] != b["status"]:
            out.append(f"statut {a['status']} → {b['status']}")
        diff(a["body"], b["body"], "$", out)
        if out:
            report.append(f"## {a['role']} GET {a['path']}\n" + "\n".join(f"- {line}" for line in out[:40])
                          + (f"\n- … {len(out) - 40} autres" if len(out) > 40 else ""))
        else:
            same += 1
    print(f"{same} lectures identiques, {len(report)} avec des différences\n")
    print("\n\n".join(report))


if __name__ == "__main__":
    if sys.argv[1] == "--compare":
        compare(sys.argv[2], sys.argv[3])
    else:
        snapshot(sys.argv[1], sys.argv[2])
