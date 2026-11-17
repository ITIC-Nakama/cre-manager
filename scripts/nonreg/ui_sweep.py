"""Non-régression (lot 9) : passe sur CHAQUE écran existant, pour chaque rôle, dans un vrai navigateur (build de production),
et relève ce qui casse : erreurs JavaScript, réponses 5xx, 4xx inattendues, boucles de requêtes (même adresse appelée
plus de 4 fois sur une page), défilement horizontal à 390 px. Captures sur données FICTIVES uniquement.

Usage : python ui_sweep.py <url_front> <dossier_captures> [desktop|mobile|both] [--old-bundle]
  --old-bundle : le front est l'ANCIEN bundle (main) branché sur la NOUVELLE API (cas « service worker périmé »).
"""
import collections
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PASSWORD = "NonReg-2026!"
ROLES = {
    "etudiant": ("nonreg.etudiant1@example.test", [
        "/student/dashboard", "/student/candidatures", "/student/offres", "/student/conseillers", "/student/connaissances",
        "/student/cv", "/student/cv/assistant", "/student/cv/depot", "/student/parametres", "/student/messages"]),
    "etudiant_vide": ("nonreg.etudiant19@example.test", [   # sans promotion, sans CV : l'état vide de l'incident des CV
        "/student/dashboard", "/student/offres", "/student/cv", "/student/cv/depot", "/student/candidatures", "/student/parametres",
        "/student/messages"]),
    "conseiller": ("nonreg.equipe1@example.test", [
        "/supervisor/dashboard", "/supervisor/etudiants", "/supervisor/candidatures", "/supervisor/offres", "/supervisor/offres/categories",
        "/supervisor/cv", "/supervisor/contenu", "/supervisor/gamification", "/supervisor/reclamations", "/supervisor/alumni",
        "/supervisor/parametres", "/supervisor/conversations", "/supervisor/espace-entreprise", "/supervisor/carte",
        "/supervisor/offres?vue=formations", "/supervisor/carte?vue=offres"]),
    "admin": ("nonreg.equipe13@example.test", [
        "/supervisor/dashboard", "/admin/conseillers", "/admin/promotions", "/admin/audit", "/supervisor/offres/synchronisation-externe",
        "/supervisor/etudiants", "/supervisor/cv", "/supervisor/offres", "/supervisor/espace-entreprise"]),
}
PUBLIC = ["/", "/login", "/signup", "/reset-password", "/privacy", "/terms", "/alumni", "/entreprise"]
NEW_ROUTES = ("/student/messages", "/supervisor/conversations", "/supervisor/espace-entreprise", "/supervisor/carte",
              "/entreprise", "vue=formations", "vue=offres")
INIT = "localStorage.setItem('cookie_consent_accepted','true'); localStorage.setItem('pwa_installed','true')"
# 4xx attendues : droits d'un rôle sur des compteurs partagés, état vide documenté.
EXPECTED_4XX = re.compile(r"/auth/refresh-token|/cv/me$|/cv/builder/me$")


def sweep(front, out, modes, old_bundle):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        for mode in modes:
            viewport = {"width": 1440, "height": 900} if mode == "desktop" else {"width": 390, "height": 844}
            plan = [("public", None, PUBLIC)] + [(r, e, paths) for r, (e, paths) in ROLES.items()]
            for role, email, paths in plan:
                ctx = browser.new_context(viewport=viewport, locale="fr-FR", service_workers="block",
                                          is_mobile=(mode == "mobile"), has_touch=(mode == "mobile"))
                ctx.add_init_script(INIT)
                page = ctx.new_page()
                if email:
                    page.goto(f"{front}/login")
                    page.locator("input[type=email]").fill(email)
                    page.locator("input[type=password]").fill(PASSWORD)
                    page.locator("button[type=submit]").click()
                    page.wait_for_url(re.compile(r"/(student|supervisor|admin|change-password)"), timeout=30000)
                for path in paths:
                    if old_bundle and any(n in path for n in NEW_ROUTES):
                        continue
                    errors, bad, calls = [], [], collections.Counter()
                    page.on("pageerror", lambda e, errors=errors: errors.append(str(e)[:160]))

                    def on_response(r, bad=bad, calls=calls):
                        if "/api/v1/" not in r.url:
                            return
                        key = r.request.method + " " + r.url.split("/api/v1")[1].split("?")[0]
                        calls[key] += 1
                        if r.status >= 500 or (r.status >= 400 and not EXPECTED_4XX.search(key)):
                            bad.append(f"{r.status} {key}")
                    page.on("response", on_response)
                    page.goto(f"{front}{path}")
                    page.wait_for_timeout(3500)
                    loops = [f"{k} ×{n}" for k, n in calls.items() if n > 4]
                    overflow = mode == "mobile" and page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
                    shot = f"{mode}-{role}-{path.strip('/').replace('/', '_').replace('?', '_').replace('=', '-') or 'accueil'}.png"
                    page.screenshot(path=out / shot)
                    page.remove_listener("response", on_response)
                    ok = not errors and not bad and not loops and not overflow
                    results.append({"mode": mode, "role": role, "path": path, "ok": ok, "errors": errors, "http": sorted(set(bad)),
                                    "loops": loops, "overflow": overflow, "requests": sum(calls.values()), "landed": page.url.split(front)[-1]})
                    print(("OK   " if ok else "ECHEC") + f" {mode:7} {role:13} {path:42} {sum(calls.values()):3} req"
                          + ("" if ok else f" | {errors[:1]} {sorted(set(bad))[:3]} {loops[:2]}{' débordement' if overflow else ''}"))
                ctx.close()
        browser.close()
    (out / "_resultats.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{sum(r['ok'] for r in results)}/{len(results)} écrans sans erreur")


if __name__ == "__main__":
    mode = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else "both"
    sweep(sys.argv[1], sys.argv[2], ["desktop", "mobile"] if mode == "both" else [mode], "--old-bundle" in sys.argv)
