# Tests — Jobboard externe, candidatures & suppression d'offres

Ce document détaille, test par test, la suite de tests couvrant l'agrégation d'offres externes
(France Travail, Adzuna, La Bonne Alternance), le découplage offre/candidature, le seuil d'XP
hebdomadaire et le nettoyage automatique des offres périmées. Contrairement à
[TEST_COVERAGE.md](./TEST_COVERAGE.md) (une ligne de résumé par module), ce document explique
**ce que chaque test fait concrètement et pourquoi il existe** — utile pour comprendre le
comportement réel du système sans relire tout le code source.

Fichiers couverts :
- `JobOfferIntegrationTest.java` (12 tests)
- `JobboardExternalSyncIntegrationTest.java` (8 tests)
- `JobOfferSpecificationIntegrationTest.java` (7 tests)
- `DashboardControllerIntegrationTest.java` — un test ciblé (`ApplicationsEndpointsTests`)

---

## 1. `JobOfferIntegrationTest.java`

Tests d'intégration sur `JobOfferService` et `JobApplicationService`, avec une base H2 en mémoire
et un contexte de sécurité simulé (`authenticate(user)` place un principal factice dans le
`SecurityContextHolder`, sans passer par un vrai login HTTP).

### `testCreateAndFetchJobOffer`
Crée une offre manuelle (titre, entreprise, description, localisation, type de contrat) via
`jobOfferService.create(...)`, puis la relit via `getById`. Vérifie simplement que l'offre créée
est bien celle qu'on relit (id, titre, entreprise identiques). Le test de base garantissant que le
chemin de création fonctionne avant de tester des cas plus subtils.

### `testSearchActiveOffers`
Crée deux offres actives avec des titres différents ("Développeur Frontend React" et
"Data Analyst"), puis cherche `"React"` via `getActiveOffers`. Vérifie qu'un seul résultat revient
et que son titre contient bien "React" — preuve que la recherche texte filtre correctement et ne
renvoie pas tout le monde.

### `testStudentJobApplication`
Un conseiller crée une offre manuelle, puis un étudiant s'authentifie et postule
(`jobApplicationService.apply(offerId)`). Vérifie que la candidature jobboard (`JobApplicationDTO`)
est bien créée avec le bon titre d'offre. C'est le scénario "normal" de postulation à une offre
ITIC — le point de départ avant de tester les cas externes/limites.

### `testApplyToExternalOfferSucceedsAndCopiesSnapshot`
**Vérifie que postuler à une offre externe fonctionne** (ça a longtemps été bloqué avec une erreur
409 dédiée — ce blocage a été retiré cette session, ce test protège contre une régression). Crée
une offre `FRANCE_TRAVAIL` avec `description`/`location`/`companyLogoUrl` renseignés, fait postuler
un étudiant, puis vérifie sur la candidature CRM créée :
- `isViaJobboard()` → `true`
- `getOffreLocation()`, `getOffreDescription()`, `getOffreCompanyLogoUrl()` → copiés **exactement**
  depuis l'offre au moment de la candidature (l'instantané, pas une référence live).

Ce test garantit à la fois "postuler à une offre externe ne plante pas" et "l'instantané de
l'offre est bien pris", deux garanties liées mais distinctes.

### `testApplicationXpWeeklyLimitCapsXpButStillCreatesCandidatures`
Le test le plus élaboré du fichier — vérifie le **seuil hebdomadaire anti-farming d'XP**
(`APPLICATION_XP_WEEKLY_LIMIT`, source-agnostique : compte les candidatures ITIC et externes
ensemble). Déroulement :
1. Force le seuil à `2` en base (au lieu de la valeur par défaut `5`) pour un test rapide et
   déterministe.
2. Crée 3 offres, fait postuler l'étudiant aux 3 dans l'ordre, en relevant son XP total après
   chacune (`xp0` avant tout, puis `xp1`, `xp2`, `xp3`).
3. Vérifie : `xp1 > xp0` (1ʳᵉ candidature créditée), `xp2 > xp1` (2ᵉ créditée aussi — seuil pas
   encore atteint), **`xp3 == xp2`** (3ᵉ candidature : seuil de 2 atteint, aucun XP supplémentaire).
4. Vérifie aussi que les **3 candidatures existent bien en base** malgré le plafond — le seuil
   limite l'XP, jamais la création de la candidature elle-même.

C'est la preuve que le système est "postuler toujours accepté, XP parfois refusé" et non
"postuler refusé après le seuil".

### `testCreateJobOfferWithSector`, `testCreateJobOfferWithoutSectorLeavesSectorNull`, `testUpdateJobOfferCanAddAndRemoveSector`, `testCreateJobOfferWithUnknownSectorIdThrows`
Quatre tests couvrant le rattachement optionnel d'une offre à un secteur (`Sector`) : création
avec secteur, création sans secteur (reste `null`, pas d'erreur), mise à jour pour ajouter puis
retirer un secteur, et rejet (`AppException`) si l'id de secteur fourni n'existe pas.

### `testDeleteJobOfferWithoutApplicationsSucceeds`
Cas trivial : une offre sans aucune candidature ni clic "postuler" se supprime sans problème.
Sert de témoin de référence avant les deux tests suivants, plus subtils.

### `testDeleteJobOfferCascadesJobboardApplicationClicks`
Crée une offre avec un **clic "postuler" isolé** (`JobApplication`, la ligne de suivi jobboard,
créée directement via le repository — pas via `apply()`, qui créerait aussi une vraie candidature
CRM). Supprime l'offre, puis vérifie que ce clic a disparu automatiquement avec elle
(`countByJobOfferId` repasse à zéro). Documente que `JobOfferService.delete()` supprime les
`JobApplication` liées **avant** de supprimer l'offre elle-même — nécessaire car leur clé
étrangère est `NOT NULL`, sans `ON DELETE` possible côté base.

### `testDeleteJobOfferWithCrmApplicationSucceedsAndDetachesReference`
**Le test le plus important du fichier historiquement** — protège contre une régression du
comportement corrigé en V14 cette session. Avant : supprimer une offre ayant une vraie candidature
CRM liée (`Application.sourceJobOffer`) était **refusé** (erreur 409). Ce blocage empêchait un
advisor de nettoyer une offre juste parce qu'un étudiant y avait postulé un jour.

Déroulement : crée une offre, crée une candidature CRM avec `sourceJobOffer` pointant dessus
(`viaJobboard=true`), puis appelle `jobOfferService.delete(offerId)`. Vérifie :
- L'offre est bien supprimée (`jobOfferRepository.findById(...)` vide).
- La candidature **survit** avec toutes ses données (`entreprise` intact).
- `isViaJobboard()` reste `true` — fait persistant, indépendant de l'offre source.
- `getSourceJobOffer()` devient `null` — la référence est détachée automatiquement
  (`ON DELETE SET NULL` côté base), pas laissée pointant vers un id inexistant.

Notes techniques dans le code : le test doit appeler `entityManager.clear()` avant la suppression
(sinon l'entité `Application` encore chargée en mémoire perturbe le flush Hibernate au moment où
`jobOffer` est supprimé dans la même session) et `flush()` + `clear()` après (sinon Hibernate
resservirait une version en cache de la candidature avec son ancienne référence, au lieu de relire
l'état réel en base après le `ON DELETE SET NULL`).

---

## 2. `JobboardExternalSyncIntegrationTest.java`

Tests sur l'agrégation externe : dédoublonnage, expiration, nettoyage, et sécurité des endpoints
admin (`/jobboard/admin/external/...`), via `MockMvc` avec de vrais tokens JWT.

### `existingSourceIdIsDetectedBeforeInsertingADuplicate`
Vérifie le **pré-check applicatif anti-doublon** : `existsBySourceId("ft:dedup-1")` renvoie `false`
avant insertion, `true` après. C'est ce pré-check (dans `ExternalJobSyncService.persistOffers()`)
qui évite de retenter d'insérer une offre déjà connue à chaque synchronisation. La vraie contrainte
SQL unique (index partiel `WHERE source_id IS NOT NULL`) sert de filet de sécurité pour les
écritures concurrentes, mais n'est pas testée ici — elle a été vérifiée manuellement contre
Postgres réel (Flyway est désactivé pour la suite de tests, donc cette contrainte SQL n'existe pas
dans le schéma H2 généré depuis les entités JPA).

### `manualOffersAreNotConstrainedBySourceId`
Deux offres manuelles ont toutes les deux `source_id = NULL`. Vérifie qu'elles peuvent coexister
sans déclencher de conflit — l'index unique ne porte que sur les lignes où `source_id` est renseigné,
donc jamais sur les offres ITIC.

### `expiredExternalOffersAreDeactivatedButManualOffersAreUntouched`
Crée trois offres : une externe expirée (date passée), une externe qui expire dans le futur, et une
**manuelle avec une date passée** dans son champ `expiresAt`. Appelle
`deactivateExpiredExternalOffers(now)` et vérifie qu'une seule ligne est touchée (l'externe
expirée) — l'externe future et **la manuelle avec date passée restent actives**, preuve que la
requête exclut explicitement `source = 'MANUAL'` (le champ `expiresAt` n'a de sens que pour les
offres externes ; une offre ITIC n'expire jamais automatiquement).

### `deleteInactiveExternalOffersOlderThanDeletesOffersWithLinkedApplications`
Protège une garantie ajoutée cette session : une offre externe peut désormais avoir une **vraie
candidature CRM liée** (depuis que postuler aux offres externes est autorisé), et le nettoyage
automatique ne doit **pas** être bloqué par ça. Crée deux offres externes expirées depuis longtemps
(400 jours) — une "orpheline", une "liée" à une candidature CRM (`viaJobboard=true`) — puis lance
la purge par lots (`JobApplicationRepository.deleteByInactiveExternalJobOfferOlderThan` d'abord,
puis `JobOfferRepository.deleteInactiveExternalOffersOlderThan`). Vérifie que **les deux offres
sont supprimées** (`deleted == 2`), et que la candidature liée **survit** avec `viaJobboard=true`
intact et `sourceJobOffer` désormais `null`.

### `deleteBySourceDeletesOffersWithLinkedApplicationsAndClicks`
Même garantie que le test précédent, mais pour la désactivation d'une source entière (quand un
admin coupe France Travail/Adzuna/La Bonne Alternance depuis l'admin). Crée deux offres
`BONNE_ALTERNANCE` — une orpheline, une avec **à la fois** un clic "postuler" (`JobApplication`) et
une candidature CRM liée. Appelle `deleteByJobOfferSource` (purge les clics — obligatoire, leur FK
est `NOT NULL`) puis `deleteBySource` (supprime les offres). Vérifie que les deux offres et le clic
disparaissent, mais que la candidature CRM survit détachée.

### `statsEndpointIsAdminOnly`
`GET /jobboard/admin/external/stats` répond `200` pour un admin, `403` pour un advisor et pour un
étudiant. Les statistiques de synchronisation (dernière exécution, compteurs par source) sont
strictement réservées à l'admin.

### `syncAndToggleEndpointsAreAdminOnly`
Un advisor reçoit `403` sur `POST /sync` et `PUT /sources/{source}/toggle`. Un admin déclenche une
synchronisation manuelle avec succès (`202 Accepted` — asynchrone, ne bloque pas la requête HTTP
le temps que la sync tourne).

### `toggleUnknownSourceReturnsNotFound`
Basculer une source qui n'existe pas (`UNKNOWN_SOURCE`) renvoie `404` avec le message
`external-source-not-found`, pas une erreur 500 générique.

---

## 3. `JobOfferSpecificationIntegrationTest.java`

Tests sur `JobOfferSpecification`, la classe qui construit dynamiquement les clauses `WHERE` des
requêtes d'offres (recherche, filtre contrat, filtre actif/inactif). Jeu de données fixe créé en
`@BeforeEach` : 3 offres — "Développeur Java Spring" (BNP Paribas, CDI, active), "Chef de Projet
Digital" (Société Générale, CDI, **inactive**), "Assistant Marketing Digital" (Capgemini, CDD,
active).

### `testActiveWithSearch`
`activeWithFilters("Java", null, null, null, null)` → ne renvoie que BNP Paribas. Vérifie le
filtre `active=true` forcé **et** la recherche texte combinés.

### `testAllFiltersByContractTypeOnly`
`withAllFilters(null, cdi.getId(), null, null, null, null)` → renvoie BNP Paribas **et** Société
Générale (les deux offres CDI), **y compris l'inactive** — `withAllFilters` (vue admin/advisor) ne
force pas `active`, contrairement à `activeWithFilters`.

### `testAllFiltersSearchAndContractTypeCombined`
Recherche "Java" + filtre CDI ensemble → seule BNP Paribas correspond aux deux critères.

### `testAllFiltersExcludesOtherContractType`
Filtre sur le CDD → seule Capgemini ressort, les deux CDI sont exclues.

### `testAllFiltersActiveTrue` / `testAllFiltersActiveFalse` / `testAllFiltersActiveNullReturnsAll`
Trois variantes du filtre `active` explicite sur `withAllFilters` : `true` → 2 résultats (les deux
actives), `false` → 1 résultat (Société Générale, la seule inactive), `null` → les 3 (aucun filtre
appliqué). Prouve que `active=null` signifie bien "toutes", pas "aucune".

---

## 4. `DashboardControllerIntegrationTest.java` — `applicationEndpointsExposeJobboardSnapshotFields`

Dans la classe imbriquée `ApplicationsEndpointsTests`. Ce test existe pour une raison précise :
`ApplicationReportingService` (qui alimente `/dashboard/applications` et
`/dashboard/applications/grouped-by-student`, les vues advisor/admin) construit sa réponse **à la
main avec des `Map`**, pas en réutilisant `ApplicationDTO` (utilisé par `/applications`, côté
étudiant). C'est un chemin de mapping entièrement séparé — et il avait été oublié une première fois
cette session (`viaJobboard` manquant), repéré uniquement par un test manuel en direct (`curl`), pas
par un test automatisé. Ce test verrouille définitivement les deux endpoints contre cette régression.

Déroulement : crée une candidature avec `viaJobboard=true` et les 3 champs d'instantané
(`offreDescription`, `offreLocation`, `offreCompanyLogoUrl`) remplis, rattachée à un étudiant qui a
déjà 2 autres candidatures (créées dans `@BeforeEach`, sans lien jobboard).

- `GET /dashboard/applications?search=Jobboard Corp` → vérifie que le résultat trouvé expose bien
  les 4 champs avec les bonnes valeurs.
- `GET /dashboard/applications/grouped-by-student?search=Jobboard Corp` → **attention à une
  subtilité documentée dans le code** : `search` filtre quel **étudiant** apparaît dans le groupe
  (celui ayant au moins une candidature correspondante), mais la réponse contient **toutes** les
  candidatures de cet étudiant, pas seulement celle qui correspond à la recherche. D'où
  `hasSize(3)` (2 candidatures existantes + la nouvelle), avec la plus récente (celle du test) en
  première position — triée par date de création décroissante.

---

## Notes de fiabilité

Comme pour [REGLES_METIER.md](./REGLES_METIER.md), ce document a été rédigé en lisant le code des
tests directement, pas de mémoire. Il devient obsolète si les tests évoluent sans mise à jour en
parallèle — en cas de doute, le fichier de test source reste la référence.
