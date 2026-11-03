# Assistant de création de CV — spécification

Plateforme ITIC CRE (cre-manager). Rédigé le 3 novembre 2026 à partir du code de `main` (a4781f7).
À placer dans `docs/CV_BUILDER_SPEC.md`. Claude Code la lit avant de coder et la tient à jour.

## 1. Objectif

Aujourd'hui, l'étudiant ne peut que **déposer un PDF**. Celui qui n'a pas de bon CV reste bloqué sur la tâche « Déposer votre CV ».
L'assistant lui permet de **construire son CV dans la plateforme** : formulaire guidé, choix d'un modèle, aperçu en direct, PDF propre.
Le PDF généré entre dans le **circuit existant**, sans le modifier : statut « En attente », relecture du conseiller, commentaires, XP à la validation.

Bénéfices à montrer :
- étudiant : un CV pro en 15 minutes, corrigé en 2 minutes quand le conseiller demande une modification ;
- conseiller : des CV homogènes, lisibles, aux normes de l'école ;
- école : des CV en **données structurées**, base du futur rapprochement profils ↔ offres (France Travail, Adzuna, La Bonne Alternance).

## 2. Le parcours (ce que Jules verra en démo)

1. L'étudiant sans CV ouvre « Mon CV ». Deux cartes : **« Créer mon CV avec l'assistant »** (recommandé) et « Déposer un PDF ».
2. L'assistant s'ouvre **prérempli** : nom, prénom, e-mail, téléphone (compte), formation en cours (promotion ITIC), expériences tirées des candidatures au contrat validé (proposées, à confirmer).
3. À gauche, le formulaire par sections. À droite, **l'aperçu exact du PDF**, mis à jour pendant la saisie.
4. En haut : choix du modèle (Classique / Moderne), couleur d'accent, état d'enregistrement (« Enregistré à 14:32 »), « Télécharger le PDF », **« Envoyer à mon conseiller »**.
5. Un **indicateur de complétude** (score sur 100 + conseils concrets : « Ajoute une accroche », « Précise le niveau de tes langues », « Ton CV fait 2 pages : vise 1 page ») guide l'étudiant.
6. « Envoyer à mon conseiller » : confirmation (même message que le remplacement actuel), puis le PDF part dans le circuit : statut « En attente », le conseiller le voit dans « Validation des CV ».
7. Le conseiller met « À corriger » avec un commentaire. L'étudiant clique **« Modifier dans l'assistant »**, corrige une ligne, renvoie. Le conseiller valide, l'étudiant gagne ses XP.

## 3. Décisions (valeurs par défaut, modifiables)

| Sujet | Décision | Raison |
|---|---|---|
| Stockage du brouillon | Une table `cv_drafts`, une ligne par étudiant, sections en JSON (colonne TEXT + convertisseur Jackson) | Sections souples et ordonnables ; TEXT reste compatible H2 (tests) et PostgreSQL |
| Moteur PDF | Thymeleaf (déjà présent) + openhtmltopdf (fork maintenu `io.github.openhtmltopdf`, vérifier la dernière version) | Même HTML pour l'aperçu et le PDF : ce que l'étudiant voit est ce qu'il obtient |
| Aperçu | Le serveur rend le **HTML** du modèle (rapide), affiché dans un `iframe srcdoc` ; le PDF n'est produit qu'au téléchargement ou à l'envoi | Fidélité au rendu final sans générer un PDF à chaque frappe |
| Polices | TTF embarquées dans `resources/fonts` (Roboto + une serif pour Classique) | L'image Docker `21-jre-alpine` n'a aucune police |
| Modèles V1 | **Classique** (une colonne, lisible par les logiciels de tri des recruteurs) et **Moderne** (deux colonnes, accent couleur) | Couvre 95 % des cas ; un 3e plus tard |
| Photo | Optionnelle, désactivée par défaut ; réutilise la photo de profil existante, pas de nouvel envoi | Usage français ; pas de nouveau fichier à gérer pour le RGPD |
| Marque ITIC | Aucun logo sur le CV ; la formation en cours affiche « ITIC Paris » | Le CV part chez des employeurs : il appartient à l'étudiant |
| Un seul CV actif | Inchangé : l'envoi passe par le même chemin de remplacement que le dépôt | Règle métier §6 |
| Dépôt PDF manuel | Conservé | Un étudiant qui a déjà un bon CV ne doit rien perdre |
| Brouillon vs envoi | Enregistrer ne touche **jamais** la ligne `cvs` ; seul « Envoyer » crée la nouvelle version | Ne pas remettre le statut à zéro à chaque frappe |
| Anti-abus XP | Envoi refusé si le contenu n'a pas changé depuis le dernier envoi (empreinte SHA-256 du JSON + modèle) | Générer un PDF ne coûte rien : éviter de « farmer » les XP |
| Langue du CV | Français par défaut, anglais possible (libellés de sections traduits) | Candidatures à l'international |
| Longueur | Avertissement au-delà d'une page (nombre de pages renvoyé par l'aperçu PDF / l'envoi) | Conseil standard pour l'alternance |

## 4. Modèle de données

### Table `cv_drafts` (migration `V45__cv_builder.sql`, DDL explicite : `ddl-auto=validate`)

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID, unique, FK `students` | Un brouillon par étudiant |
| `data` | TEXT (JSON) | Voir structure ci-dessous |
| `template_code` | VARCHAR(30) | `CLASSIQUE` ou `MODERNE` |
| `accent_color` | VARCHAR(7) | Hex, liste fermée côté serveur |
| `cv_lang` | VARCHAR(2) | `fr` / `en` |
| `last_submitted_hash` | VARCHAR(64), nullable | Empreinte du dernier envoi |
| `last_submitted_at` | TIMESTAMP, nullable | |
| `created_at`, `updated_at` | TIMESTAMP | |
| `version` | BIGINT | Verrou optimiste (`@Version`), comme `CV` |

### Colonnes ajoutées à `cvs` (même migration)
- `source` VARCHAR(10) NOT NULL DEFAULT `'UPLOAD'` (`UPLOAD` | `BUILDER`) ;
- `template_code` VARCHAR(30) NULL.

### Audit
Nouvelle action `CV_GENERATED` (envoi depuis l'assistant). Reconstruire la contrainte `audit_logs_action_check` en recopiant la liste complète de `V44__alumni_contacts.sql`.

### Structure JSON `data` (DTO typés côté Java, validés)

```json
{
  "identite": { "prenom": "", "nom": "", "titre": "Développeur full-stack en alternance",
                "email": "", "telephone": "", "ville": "", "mobilite": "",
                "liens": [{ "type": "LINKEDIN|GITHUB|PORTFOLIO|AUTRE", "url": "" }],
                "afficherPhoto": false },
  "accroche": "≤ 400 caractères",
  "experiences": [{ "id": "", "poste": "", "entreprise": "", "ville": "", "typeContrat": "",
                    "debut": "2025-09", "fin": null, "enCours": true, "points": ["", ""] }],
  "formations": [{ "id": "", "diplome": "", "etablissement": "", "ville": "",
                   "debut": "", "fin": "", "enCours": false, "mention": "" }],
  "projets": [{ "id": "", "nom": "", "lien": "", "description": "", "technos": [""] }],
  "competences": { "techniques": [""], "outils": [""], "savoirEtre": [""] },
  "langues": [{ "langue": "", "niveau": "A1|A2|B1|B2|C1|C2|NATIF" }],
  "certifications": [{ "nom": "", "organisme": "", "date": "" }],
  "centresInteret": [""],
  "ordreSections": ["experiences", "formations", "projets", "competences", "langues", "certifications", "centresInteret"],
  "sectionsMasquees": []
}
```

Limites (validation serveur, messages `MessageKey` fr/en) : 15 expériences, 10 formations, 10 projets, 6 points par expérience, 200 caractères par point, URLs en `http(s)` uniquement, dates `YYYY-MM`.

### Préremplissage (premier accès uniquement)
- `User` : prénom, nom, e-mail, téléphone.
- `Promotion` + `studyYear` : formation en cours « <nom de la promotion> — ITIC Paris », `enCours: true`.
- `Application` avec `contractVerified = true` : expériences proposées (poste, entreprise, type de contrat, dates), marquées « à confirmer » dans l'interface.

## 5. API (sous `/api/v1`, rôle STUDENT, `SecurityContextHelper.currentUserId()`)

| Méthode et chemin | Rôle |
|---|---|
| `GET /cv/builder/me` | Brouillon ; s'il n'existe pas, renvoie un brouillon prérempli **non enregistré** |
| `PUT /cv/builder/me` | Enregistre (auto-sauvegarde) ; corps avec `version` ; 409 si conflit |
| `POST /cv/builder/me/preview` | Corps = brouillon courant (même non enregistré) ; renvoie `text/html` ; `Cache-Control: no-store` |
| `POST /cv/builder/me/pdf` | Renvoie le PDF (`application/pdf`, `byte[]` : pas d'enveloppe) + en-tête `X-Page-Count` ; ne soumet rien |
| `POST /cv/builder/me/submit` | Génère, contrôle (`%PDF-`, ≤ 10 Mo), stocke, remplace le CV actif ; renvoie la réponse CV habituelle |
| `GET /cv/builder/me/score` (ou calculé dans `GET`) | Score de complétude + liste de conseils |

Conseiller / admin (lecture seule, V1) : `GET /cv/student/{studentId}/builder` pour afficher « Généré avec l'assistant — modèle Moderne » dans `CVDetailModal`.

### Envoi : réutiliser le circuit existant
Extraire de `CVService.uploadCV` une méthode commune, par exemple `replaceActiveCv(Student, InputStream, long size, CvSource, String templateCode)` :
1. statut = premier statut actif par `ordre` ;
2. réutilise la ligne `cvs` existante (unicité `student_id`) ;
3. fichier stocké via `ICloudStorage.uploadFile(InputStream, path, "application/pdf", length)` au chemin **`cvs/{studentId}-{epochMillis}.pdf`** (sinon `FileAccessFilter` refuse l'étudiant en mode local) ;
4. `uploadedAt = now`, `updatedAt = null`, `xpAwarded = false`, `source`, `templateCode` ;
5. ancien fichier supprimé seulement après la réussite du nouvel envoi ;
6. audit `CV_UPLOADED` (dépôt) ou `CV_GENERATED` (assistant).

`uploadCV` (dépôt manuel) appelle la même méthode : un seul chemin, un seul comportement.
Gérer `ObjectOptimisticLockingFailureException` (déjà mappée par `GlobalExceptionHandler`).

## 6. Modèles PDF

- `src/main/resources/templates/cv/classique.html` et `moderne.html`, partageant des fragments Thymeleaf (`cv/fragments.html`).
- A4, marges 15 mm, CSS imprimable compatible openhtmltopdf (pas de flexbox avancé : tableaux ou `float` pour Moderne).
- Libellés de sections traduits fr/en via les messages Thymeleaf.
- Sections vides masquées ; ordre selon `ordreSections`.
- Couleurs d'accent : liste fermée (bleu ITIC `#3B71FF`, orange `#E2782E`, vert, gris anthracite, bordeaux).
- Texte sélectionnable (pas d'image), métadonnées PDF : titre « CV — Prénom Nom », auteur.
- Nom du fichier téléchargé : `CV_Nom_Prenom.pdf` (même logique que `nomFichier`).

## 7. Interface

### Étudiant
- `StudentCVPage` :
  - sans CV : deux cartes (« Créer mon CV avec l'assistant », « Déposer un PDF ») au lieu du seul `CVDropzone` ;
  - avec un CV généré : bouton **« Modifier dans l'assistant »** à côté de « Voir » et « Remplacer » ;
  - le circuit (`CycleStrip`, commentaires) reste identique.
- Nouvelle page `/student/cv/assistant` (`F/pages/student/cv-builder/`) :
  - barre du haut : modèle, couleur, langue du CV, état d'enregistrement, « Télécharger », « Envoyer à mon conseiller » ;
  - colonne gauche : sections repliables, `react-hook-form` + `useFieldArray` (ajouter, supprimer, réordonner les entrées), compteur de caractères, aide courte par champ ;
  - colonne droite : aperçu (`iframe srcdoc`, requête anti-rebond 600 ms), zoom, badge « 1 page » / « 2 pages » ;
  - panneau de complétude : score et conseils cliquables (ouvrent la section concernée) ;
  - mobile : onglets Formulaire / Aperçu ;
  - auto-sauvegarde anti-rebond 1,5 s + au changement de section ; avertissement si l'on quitte avec des changements non enregistrés ;
  - commentaires du conseiller visibles dans l'assistant (panneau latéral) pour corriger sans changer de page.
- `F/api-s/requests/CVBuilderRequest.ts`, `F/hooks/useCVBuilder.ts` (TanStack Query), types `F/types/models/CVBuilder.ts`, i18n `studentCvBuilder` dans `fr.json` et `en.json`.
- PWA : exclure `/api/v1/cv/builder/` du cache NetworkFirst (`vite.config.ts`).

### Conseiller
- `CVDetailModal` et `CVValidationPage` : badge « Assistant » + nom du modèle quand `source = BUILDER`.
- Rien d'autre ne change pour lui en V1.

## 8. RGPD
- Export (`GdprService` export) : inclure le brouillon.
- Anonymisation / suppression : supprimer la ligne `cv_drafts`.
- Le brouillon n'est visible que par l'étudiant (et en lecture par conseiller/admin).

## 9. Tests (intégration, style `CVIntegrationTest`)
1. Premier `GET` : brouillon prérempli depuis le compte et la promotion, rien d'enregistré.
2. `PUT` puis `GET` : données relues identiques ; `PUT` avec une version périmée → 409.
3. Validation : URL invalide, trop d'expériences, niveau de langue inconnu → 400 avec `MessageKey`.
4. `preview` : HTML contenant le nom et les sections non vides, pas les sections masquées.
5. `pdf` : octets commençant par `%PDF-`, `X-Page-Count ≥ 1`, polices embarquées (pas d'exception sur l'alpine).
6. `submit` sans CV existant : crée la ligne `cvs`, statut premier par `ordre`, `source = BUILDER`, chemin `cvs/{studentId}-…pdf`, audit `CV_GENERATED`.
7. `submit` avec CV existant validé : même ligne réutilisée, statut remis « En attente », `xpAwarded = false`, ancien fichier supprimé.
8. `submit` sans changement depuis le dernier envoi → refusé.
9. Un étudiant ne peut ni lire ni modifier le brouillon d'un autre.
10. Anonymisation RGPD : brouillon supprimé.
11. Dépôt manuel : comportement inchangé (tests existants verts).

Les tests tournent sur H2 sans Flyway : **jouer aussi `V45` sur le PostgreSQL de `docker-compose`** avant la démo.

## 10. Données de démo
Seeder de test (`@Order(20+)`, profil dev uniquement) : un étudiant « démo » sans CV avec une candidature au contrat validé (pour montrer le préremplissage), et un second avec un brouillon complet déjà envoyé au statut « À corriger » et un commentaire du conseiller.

## 11. Découpage en commits
1. Migration `V45`, entité `CvDraft`, DTO, dépôt, validation, préremplissage + tests 1-3.
2. Moteur PDF : dépendance, polices, modèles Classique et Moderne, service de rendu + tests 4-5.
3. Refactorisation `replaceActiveCv`, endpoint `submit`, audit, anti-abus + tests 6-8, 11.
4. Page assistant (formulaire, aperçu, auto-sauvegarde, complétude).
5. Intégration `StudentCVPage`, badge conseiller, i18n, PWA, RGPD + tests 9-10.
6. Seeder de démo, relecture visuelle des deux modèles, mise à jour de `docs/REGLES_METIER.md` §6.

## 12. Hors V1 (à présenter comme la suite)
- Rapprochement CV ↔ offres (compétences et localisation vs offres France Travail / Adzuna / La Bonne Alternance).
- Suggestions d'accroche et reformulation des expériences par IA.
- 3e modèle, import d'un CV PDF existant pour préremplir.
- Commentaires du conseiller rattachés à une section précise.
- Notification au conseiller quand un CV est envoyé (aujourd'hui aucune).

## 13. Écarts relevés dans l'existant (à signaler à Jules, corriger seulement avec son accord)
- **Compteur « CV à relire »** (`CVRepository.countNotInFinalStatut`) : il compte `ordre < MAX(ordre)`. Avec « À corriger » en ordre 3, le badge compte *En attente + Validé* au lieu de *En attente* (ou *En attente + À corriger*).
- **Tâche « Corriger votre CV »** détectée par `nom.contains("corriger")` : fragile si un admin renomme le statut.
- **Règle §6 vs code** : la doc dit que l'historique est réinitialisé au remplacement, alors que le code garde les commentaires (et l'interface l'annonce). Choisir et aligner la doc.
- **Taille maximale** : `REGLES_METIER` §7 annonce 512 Mo, la configuration est à 20 Mo.
