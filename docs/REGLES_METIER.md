# Règles métier — ITIC CRE

Document de référence des règles métier réellement implémentées dans le code (backend `itic-cre-backend`). À mettre à jour si une règle change — ce document doit refléter le code, pas l'inverse.

---

## 1. Authentification & comptes

### Rôles
Trois rôles, un seul par utilisateur (`users.role_id`) : `STUDENT`, `ADVISOR`, `ADMIN`.

| Rôle | Création | OTP email |
|---|---|---|
| STUDENT | `POST /auth/register` (public) | Oui, obligatoire |
| ADVISOR | `POST /auth/admin/users` (admin connecté) | Non |
| ADMIN | `POST /auth/admin/users` (admin connecté) | Non |

### Inscription étudiant
- `emailVerified = false` à la création ; un OTP (6 chiffres, expire après **10 minutes**) est envoyé automatiquement.
- **La connexion est bloquée tant que l'email n'est pas vérifié** (`EMAIL_NOT_VERIFIED`).
- Pas de limite de tentatives sur la validation OTP, pas de cooldown sur le renvoi (une demande de renvoi invalide simplement l'OTP précédent).
- `promotionId` est **optionnel** à l'inscription.
- Mot de passe : 8 à 128 caractères, aucune contrainte de complexité (pas de regex majuscule/chiffre/symbole imposée).

### Comptes admin/conseiller créés par un admin
- Créés avec un **mot de passe temporaire** et `mustChangePassword = true`.
- Tant que `mustChangePassword = true`, **tous les endpoints sont bloqués (403 `password-change-required`) sauf** `POST /auth/change-password` et `POST /auth/logout`.
- Pas d'OTP pour ces comptes (`emailVerified = true` directement).
- Un email contenant le mot de passe temporaire est envoyé automatiquement (**asynchrone**, `@Async`) à la création du compte.
- **Réinitialisation / modification de mot de passe par un tiers interdite pour les comptes `ADMIN`** (`ADMIN_PASSWORD_RESET_FORBIDDEN`, HTTP 403) — un admin ne peut pas réinitialiser le mot de passe d'un autre admin via l'interface ou l'API.

### Gouvernance Multi-Admin & Désactivation RBAC
- **Plafond d'administrateurs actifs** : Limité à 2 admins actifs simultanément (`ADMIN_MAX_ACTIVE=2`). Tout ajout ou réactivation d'un 3ème admin est bloqué avec `ADMIN_CAP_REACHED`.
- **Règles de désactivation par rôle** :
  - **`ADMIN`** : Peut désactiver des comptes étudiants, conseillers et administrateurs.
  - **`ADVISOR`** : Peut désactiver **uniquement** des comptes étudiants (`STUDENT`). Toute tentative de désactiver un conseiller ou admin renvoie **403 Access Denied**.
- **Protections d'intégrité** :
  - **Auto-désactivation interdite** pour les comptes administrateurs (`CANNOT_SELF_DEACTIVATE`).
  - **Dernier administrateur actif protégé** : Impossible de désactiver le dernier admin si `activeAdmins <= 1` (`LAST_ADMIN_PROTECTION`).
  - **Suppression physique interdite** pour les administrateurs (`ADMIN_CANNOT_BE_DELETED`).
- **Suppression d'un conseiller** : si des données lui sont rattachées (commentaires CV, offres d'emploi créées, articles créés, catégories de compétences créées), le compte est **désactivé** (`active = false`) au lieu d'être supprimé. La suppression définitive n'a lieu que si **aucune donnée associée** n'existe.
- **Coupure de session** : le flag `active` est vérifié **à chaque requête authentifiée** dans le filtre JWT ; un compte désactivé perd l'accès dès sa prochaine requête.

### Retention & Purge Automatisée RGPD (Configuration Applicative Dynamique BDD)
- **Conservation des données RGPD** : Les durées de rétention ne sont plus figées dans les fichiers d'environnement (`.env` / `application.properties`), mais sont gérées dynamiquement en base de données (`app_configuration`) et modifiables par les administrateurs depuis l'interface client ("Paramètres" → "Configuration Applicative") :
  - **`GDPR_OTP_RETENTION_HOURS`** (par défaut : **24 heures**) : Délai de purge des codes OTP de vérification d'email expirés.
  - **`GDPR_AUDIT_LOG_RETENTION_DAYS`** (par défaut : **365 jours**) : Durée de conservation légale des journaux d'audit et de traçabilité.
  - **`GDPR_INACTIVE_STUDENT_RETENTION_DAYS`** (par défaut : **1095 jours**, soit 3 ans) : Délai d'inactivité avant anonymisation/suppression automatique du compte étudiant.
- **Tâche planifiée (`GdprPurgeScheduler`)** : Exécutée quotidiennement à 03:00 du matin, elle interroge directement `AppConfigurationService` pour appliquer dynamiquement les règles de purge et d'anonymisation configurées en BDD.
- **Navigation & Interface Admin** : Dans le menu principal (sidebar), l'entrée est nommée **"Paramètres"** (avec icône de configuration) pour le rôle `ADMIN` au lieu de "Profil", donnant accès au sous-menu bilingue "Paramètres du Compte" et "Configuration Applicative".

### Anonymisation RGPD & Distinction Portefeuille vs Activité
- **Effacement nominatif** : L'anonymisation RGPD (`GdprService`) remplace l'identité par `"Anonyme Utilisateur RGPD"`, l'email par `deleted_<UUID>@rgpd.deleted`, détruit le mot de passe, désactive le compte (`active = false`), supprime physiquement le fichier CV et détache l'étudiant de toute promotion (`student.setPromotion(null)`).
- **Règle de filtrage selon le type de statistique** :
  - **1. Statistiques "Portefeuille" & Comptage de Personnes** (`email NOT LIKE '%@rgpd.deleted'`) :
    - S'applique aux listings d'étudiants, à la recherche par promotion, au total d'étudiants à coacher et au portefeuille actif d'un conseiller.
    - Un étudiant anonymisé/parti ne fait plus partie du portefeuille actif d'accompagnement et doit être **exclu**.
  - **2. Statistiques "Activité" & Événements** (Pas de filtre d'anonymisation) :
    - S'applique aux métriques globales d'activité : volume de candidatures suivies, historiques de transitions de statut (`ApplicationStatusHistory`), taux de placement/conversion.
    - L'anonymisation efface l'identité nominative mais conserve les données d'activité. Les candidatures des comptes anonymisés **restent comptabilisées** dans les indicateurs d'activité du conseiller afin de préserver l'exactitude des métriques sans fausser les volumes historiques.
- **Rendu dans l'interface** : La ligne *"Anonyme Utilisateur RGPD"* ne s'affiche jamais dans le tableau des personnes, mais ses candidatures passées continuent d'alimenter les widgets d'activité agrégée du conseiller (sans lien cliquable vers l'identité).
- **Filtre optionnel d'Audit DPO (Réservé `ADMIN`)** :
  - Un filtre case à cocher *"Afficher les comptes supprimés (RGPD)"* (`includeAnonymized=true`) est mis à disposition uniquement pour le rôle `ADMIN` à des fins de contrôle/traçabilité DPO.
  - Lorsqu'il est coché, les comptes anonymisés apparaissent dans la table avec une ligne ombrée et un badge ambre `Supprimé (RGPD)`. Aucun bouton d'action opérationnel (ni relance, ni désactivation, ni réactivation) n'est proposé sur ces lignes.
- **Réactivation et notifications interdites** :
  - La réactivation via `PATCH /auth/users/{id}/reactivate` et l'envoi de rappels via `POST /dashboard/students/{id}/notify` sont **strictement bloqués** en backend (HTTP 403 `ANONYMIZED_USER_CANNOT_BE_REACTIVATED`).

### Autorisation sur la mise à jour de profil
- `PUT /auth/users/{id}` (modifier le profil d'un **autre** utilisateur) est réservé à `ADMIN` (faille IDOR corrigée).
- `PUT /auth/users/me` (modifier son **propre** profil) n'a pas de restriction de rôle — accessible à tout utilisateur connecté, scoping fait via l'utilisateur courant.

### Tokens
- Access token : expiration par défaut **1h** (`TOKEN_EXPIRATION_TIME=3600000`).
- Refresh token : expiration par défaut **7 jours** (`REFRESH_TOKEN_EXPIRATION_TIME=604800000`).
- Transmis soit en cookie (`token`), soit en header `Authorization: Bearer`.
- Le refresh échoue aussi si `mustChangePassword = true`.

### Affectation conseiller référent (Admin-en-tant-que-conseiller)
- `Student.advisor` accepte n'importe quel membre du staff actif (`ADVISOR` **ou** `ADMIN`) — un admin peut être affecté comme conseiller référent d'un étudiant au même titre qu'un conseiller, et les admins sont assignables entre eux (pas seulement en auto-affectation).
- `PUT /advisors/{advisorId}/students` (`ADMIN` uniquement) affecte un lot d'étudiants ; retirer le conseiller d'un étudiant remet `advisor = null`.
- **Dashboard** (`GET /dashboard/overview`, `GET /dashboard/students/needing-attention`) : un `ADVISOR` est toujours scopé à son propre id. Un `ADMIN` peut passer un `advisorId` optionnel pour voir un portefeuille précis (toggle "Vue globale / Mon portefeuille" côté interface), ou l'omettre pour la vue globale (comportement par défaut).
- **Étudiants / Candidatures / CV Validation** : un `ADMIN` dispose d'une checkbox "Mes étudiants uniquement" (même mécanisme que pour un `ADVISOR`) en plus du picker complet des conseillers ; le picker de filtre exclut l'admin courant (couvert par la checkbox), mais le picker d'**affectation** (bulk-assign) l'inclut toujours, en tête de liste, sous le libellé "Moi".

### Promotions
- Nom **unique**.
- Lecture (lister / consulter) : ouverte à **tout utilisateur connecté**, sans restriction de rôle (advisor et étudiant inclus).
- Création / modification / suppression : réservées à `ADMIN` et `ADVISOR`.
- **Une promotion ne peut être supprimée si elle contient au moins un étudiant** (`promotion-has-students`, 400) — il faut d'abord réaffecter ou retirer tous les étudiants de cette promotion.
- `PUT /promotions/{id}/students/{studentId}` (`ADMIN`/`ADVISOR`) affecte un étudiant à la promotion. Si l'étudiant avait déjà une autre promotion, c'est traité comme un **déplacement** (libellé d'audit différent : "Déplacé" vs "Affecté"), mais dans les deux cas l'action journalisée est `STUDENT_ASSIGNED_TO_PROMOTION`.

---

## 2. CRM — Candidatures

### Statuts par défaut (modifiables uniquement en XP/couleur via l'admin, nom/ordre fixes)

| Statut | Ordre | XP | Déclenche l'alerte "stale" |
|---|---|---|---|
| À postuler | 1 | 0 | Non |
| Postulé | 2 | 5 | **Oui** |
| Entretien décroché | 3 | 15 | **Oui** |
| Entretien passé | 4 | 10 | Non |
| Offre reçue | 5 | 25 | Non |
| Refusé | 6 | 0 | Non |

### Attribution XP sur changement de statut
- XP attribuée **uniquement la première fois** qu'une candidature atteint un statut donné (vérifié via l'historique des transitions) — rebasculer sur un statut déjà atteint ne redonne pas l'XP.
- Le montant vient de `ApplicationStatus.gainXP` du nouveau statut (pas d'une config générique).

### Alerte "candidature qui stagne" (stale)
- Seuil par défaut : **10 jours** (`STALE_ALERT_DAYS`, configurable par l'admin via `AppConfiguration`).
- Une candidature est `stale` si **et seulement si** : son statut actuel a `declencheAlerte = true` **ET** `dateModification` date de plus de N jours.
- `dateModification` est mise à jour automatiquement (Hibernate `@UpdateTimestamp`) à chaque sauvegarde de la candidature.

### Tâches automatiques (À faire aujourd'hui)
Les tâches affichées sur le tableau de bord de l'étudiant sont calculées dynamiquement par le serveur :
- **Pas de candidature (`NO_APPLICATION`)** : Ajouté s'il n'a aucune candidature enregistrée (Libellé : *"Ajouter votre première candidature"*).
- **Relance nécessaire (`STALE_APPLICATION`)** : Ajouté pour chaque candidature stagnante (stale) dans le CRM (Libellé : *"Relancer [Nom de l'entreprise]"*). Limité aux 3 plus anciennes candidatures stagnantes.
- **Pas de CV déposé (`NO_CV`)** : Ajouté si l'étudiant n'a pas encore téléversé son premier CV (Libellé : *"Déposer votre CV"*).
- **CV à corriger (`CV_TO_CORRECT`)** : Ajouté si le conseiller a attribué le statut "À corriger" au CV de l'étudiant (Libellé : *"Corriger votre CV"*).

Ces libellés sont traduits dynamiquement par le backend selon la langue spécifiée dans les en-têtes HTTP de la requête cliente.

### Suivi "sous contrat" (déclaration étudiante + vérification conseiller)
- **Purement déclaratif à l'origine** : `ApplicationStatus.compteCommeContrat` marque un statut comme "vaut contrat" (seul "Offre reçue" par défaut). Un étudiant peut lui-même faire passer sa candidature à ce statut, sans preuve — aucune validation n'est requise pour la déclaration elle-même. Une date de début (`Application.startDate`) est **obligatoire** pour atteindre un tel statut (`APPLICATION_CONTRACT_START_DATE_REQUIRED` sinon), une date de fin (`endDate`) est optionnelle. Les deux dates restent éditables ensuite par l'étudiant (formulaire de candidature) comme par un conseiller/admin.
- **Vérification par un conseiller/admin** : `Application.contractVerified` (`false` par défaut, remis à `false` à chaque **nouvelle** déclaration `compteCommeContrat`) distingue une déclaration en attente d'une déclaration confirmée. Trois actions dédiées, réservées `ADVISOR`/`ADMIN`, **ouvertes à n'importe quel conseiller/admin** (pas seulement celui affecté à l'étudiant — même philosophie que les autres actions conseiller : relance, CV, promotion...) :
  - `POST /dashboard/applications/{id}/verify-contract` : marque `contractVerified = true`.
  - `POST /dashboard/applications/{id}/reject-contract` : annule la déclaration, revient au statut précédent (comme un retour en arrière fait par l'étudiant) et révoque l'XP gagné entre-temps. Seule action du flux qui notifie l'étudiant par email (voir §12) — la vérification/confirmation, elle, ne déclenche aucun email, seul le badge de son suivi passe au vert.
  - `PATCH /dashboard/applications/{id}/contract-dates` : modifie les dates ; toucher les dates vaut confirmation implicite (`contractVerified` passe à `true`).
  - Les deux premières actions sont journalisées (`APPLICATION_CONTRACT_VERIFIED`, `APPLICATION_CONTRACT_REJECTED`, voir §8).
- **Pas de cumul de postes** : seule la **dernière** déclaration `compteCommeContrat` en date (`startDate` le plus récent pour cet étudiant) compte jamais comme "sous contrat" ou "à vérifier" — une ancienne déclaration jamais clôturée n'est pas prise en compte en plus du poste actuel.
- **"Sous contrat" (`underContract=true`, filtre/stat/badge)** = dernière déclaration, **vérifiée**, et pas de date de fin déjà passée (`endDate IS NULL OR endDate >= aujourd'hui`). Ne nécessite **pas** que la date de début soit déjà atteinte : signature + confirmation suffisent, un étudiant déclare le plus souvent une offre avant que le contrat ne démarre réellement. Filtre disponible sur `GET /dashboard/students`, `GET /dashboard/students/all` et `GET /dashboard/applications/grouped-by-student`.
- **Exclusion par défaut (`underContract=false`)** ne s'applique qu'aux déclarations **déjà vérifiées** — une déclaration encore en attente reste visible dans la vue par défaut (avec son badge "À vérifier"), pour que le conseiller la découvre sans devoir changer de filtre.
- **Besoin de vérification (`studentsNeedingContractVerificationCount`, badge "À vérifier")** = dernière déclaration `compteCommeContrat`, **non vérifiée**. Volontairement **sans aucune contrainte de date** (ni début ni fin) : l'alerte doit apparaître dès la déclaration, avant même que le contrat ne démarre — attendre la date de début viderait l'alerte de son intérêt, qui est justement de permettre une vérification en amont.
- **Fin de contrat** : pas de statut dédié "rompu"/"terminé" — l'étudiant renseigne lui-même une date de fin (via son formulaire d'édition de candidature). Dès qu'elle est dépassée, la candidature sort automatiquement de "sous contrat" sans action du conseiller ; `contractVerified` n'est pas réinitialisé pour autant (une simple modification de dates ne redemande pas de vérification, seul un nouveau passage vers un statut `compteCommeContrat` le fait).
- **Dashboard conseiller** : la carte d'alerte (`/dashboard/overview`) affiche les candidatures stagnantes et les contrats à vérifier **dans la même carte**, empilés l'un sous l'autre si les deux comptes sont non nuls (pas deux cartes distinctes) ; carte neutre "Tout est à jour !" uniquement si les deux compteurs sont à zéro.

---

## 3. Jobboard — Offres d'emploi

### Sources d'offres
Une offre (`JobOffer.source`) vient soit de `MANUAL` (créée par un `ADVISOR`/`ADMIN` depuis
l'interface ITIC), soit d'une des 3 sources externes agrégées automatiquement : `FRANCE_TRAVAIL`,
`ADZUNA`, `BONNE_ALTERNANCE`. Toutes les offres — quelle que soit leur source — vivent dans la même
table et sont traitées de façon identique pour la recherche, le filtrage et la candidature ; seule
la synchronisation et l'expiration diffèrent par source (voir plus bas).

### Critères de recherche des sources externes — 100% configurables en base, jamais codés en dur
Chaque source a une ligne dans `external_source_configs` (`enabled`, `romeCodes`, `departments`,
`keywords`, `category`, `excludedEmployers`), éditable par un `ADMIN` depuis Offres → Offres
externes, **sans redéploiement**.

- `romeCodes`/`departments` : pertinents pour `FRANCE_TRAVAIL` et `BONNE_ALTERNANCE` (les deux
  exposent la taxonomie ROME officielle).
- `keywords`/`category` : pertinents pour `ADZUNA` (pas de taxonomie ROME côté Adzuna).
- `excludedEmployers` : les 3 sources — liste d'employeurs à exclure (comparaison insensible à la
  casse, sous-chaîne), pour filtrer les officines qui postent de fausses offres pour recruter des
  inscrits payants (ex : `ISCOD`, `CFA ITIS`).
- **Règle absolue** : un critère non configuré (`null`/vide en base) signifie **aucune
  restriction** sur ce critère, jamais un repli silencieux sur une valeur par défaut codée en dur.
  Vérifié en direct contre les APIs réelles : omettre `codeROME` chez France Travail renvoie bien
  toutes professions confondues, pas un sous-ensemble caché.

### Synchronisation
- Déclenchée automatiquement (`jobboard.sync.cron`, tous les jours à 2h par défaut) ou
  manuellement (`POST /jobboard/admin/external/sync`, `ADMIN` uniquement, réponse `202 Accepted` —
  asynchrone).
- **Pagination réelle** par provider, jusqu'à `JOBBOARD_SYNC_MAX_PER_PROVIDER` offres par source et
  par synchronisation (config BDD, §11) :
  - `FRANCE_TRAVAIL` : boucle codeROME × nature de contrat × pages de 150 (`range=X-Y`), plafonné à
    1150 résultats par recherche (limite documentée de l'API).
  - `ADZUNA` : boucle mot-clé × pages de 50 (`/search/{page}`), plafonné à 1000 résultats par
    recherche (20 pages).
  - `BONNE_ALTERNANCE` : **aucune pagination possible** côté API — un seul appel par
    synchronisation, plafond réel de l'ordre de 40 à 150 résultats selon les critères. Limitation
    confirmée de l'API elle-même, pas un choix d'implémentation.
- **Dédoublonnage** : pré-check applicatif (`existsBySourceId`) avant insertion, doublé d'une
  contrainte SQL unique partielle (`WHERE source_id IS NOT NULL`) comme filet de sécurité contre
  les écritures concurrentes.
- **Tri des résultats** : France Travail et Adzuna renvoient les offres les plus récentes en
  premier par défaut (vérifié en direct) — la pagination privilégie donc les offres fraîches avant
  d'atteindre le plafond. La Bonne Alternance ne propose aucun paramètre de tri.

### Expiration des offres externes
- `FRANCE_TRAVAIL`/`ADZUNA` : ces APIs ne fournissent qu'une date de dernière mise à jour
  (`dateActualisation`/`created`), jamais de vraie date d'expiration. `expiresAt` est donc
  **calculé** : date de mise à jour + `JOBBOARD_OFFER_EXPIRATION_DAYS` (30 jours par défaut,
  config BDD).
- `BONNE_ALTERNANCE` : cette API fournit une **vraie date d'expiration** directement
  (`offer.publication.expiration`) — utilisée telle quelle, aucun calcul.
- `deactivateExpiredExternalOffers()` (tourne à chaque synchronisation) désactive
  (`active=false`) toute offre externe dont `expiresAt` est dépassée. Les offres `MANUAL` ne sont
  jamais concernées (`expiresAt` n'a de sens que pour l'externe).
- `deleteInactiveExternalOffersOlderThan()` (même déclenchement) supprime **définitivement** les
  offres externes inactives depuis plus de `JOBBOARD_OFFER_DELETE_AFTER_DAYS` (30 jours par défaut)
  après leur expiration — empêche l'accumulation indéfinie d'offres mortes en base.

### Désactiver une source (admin)
`PUT /jobboard/admin/external/sources/{source}/toggle` — désactiver une source supprime
**immédiatement toutes ses offres déjà en base** (pas seulement les futures synchronisations) : un
provider en pause ne doit pas laisser traîner des offres qu'il n'assume plus. Réactiver ne restaure
rien ; la prochaine synchronisation réinsère les offres fraîches. Les clics "postuler" liés
(`JobApplication`, clé étrangère `NOT NULL`) sont purgés explicitement avant les offres elles-mêmes ;
les candidatures CRM liées survivent, juste détachées (voir "Découplage offre/candidature"
ci-dessous).

### Postuler à une offre (ITIC ou externe, même règle pour les deux)
- Un étudiant **ne peut postuler qu'une seule fois** à une offre donnée (`409 already-applied`
  sinon).
- Postuler crée **automatiquement** une candidature CRM au statut "Postulé", avec la note
  `"Candidature créée automatiquement via le Jobboard"` — que l'offre soit `MANUAL` ou externe,
  aucune distinction de traitement.
- **Instantané de l'offre copié à la création** : `entreprise`, `poste`, `typeContrat`,
  `lienOffre`, et depuis cette session `offreDescription`, `offreLocation`,
  `offreCompanyLogoUrl` — la candidature reste complète et affichable même si l'offre source est
  supprimée ou expire ensuite. `viaJobboard` (booléen persistant, indépendant de la référence
  technique) trace définitivement l'origine "jobboard" de la candidature.
- **Seuil hebdomadaire anti-farming d'XP** (`APPLICATION_XP_WEEKLY_LIMIT`, 5 par défaut, config
  BDD, source-agnostique — ITIC et externe comptent ensemble) : au-delà de N candidatures créditées
  en XP sur une fenêtre glissante de 7 jours, la candidature suivante est **quand même créée
  normalement** (trackée dans le CRM), juste sans crédit XP supplémentaire. Le plafond limite
  uniquement l'XP, jamais la création de la candidature.
- XP attribuée (quand le seuil le permet) : le `gainXP` du statut "Postulé" s'il est **> 0**, sinon
  repli sur la config générique `CANDIDATURE_CREATED` (jamais les deux à la fois).

### Découplage offre/candidature (V14/V15 — supprimer une offre ne bloque plus jamais)
- `Application.sourceJobOffer` reste une vraie clé étrangère (seul usage restant : retrouver la
  candidature à supprimer lors d'un retrait côté jobboard), mais en `ON DELETE SET NULL` :
  supprimer l'offre détache juste la référence, ne bloque jamais et ne supprime jamais la
  candidature. Ce champ n'est plus exposé au frontend — l'affichage de l'offre depuis une
  candidature se fait uniquement via l'instantané copié (ci-dessus), jamais par un appel live vers
  l'offre source.
- `Application.viaJobboard` est un booléen **persisté à la création**, indépendant de
  `sourceJobOffer` — reste `true` pour toujours, même après suppression de l'offre d'origine.
- **Suppression d'une offre** (`JobOfferService.delete()`) : **toujours acceptée**, quel que soit
  le nombre de candidatures liées. Les clics "postuler" (`JobApplication`, FK `NOT NULL`) sont
  supprimés avec l'offre ; les candidatures CRM survivent intactes, juste détachées.
- **Retrait côté jobboard** (`JobApplicationService.withdraw()`) : part toujours du clic "postuler"
  (`JobApplication`), jamais de l'offre elle-même — et ce clic est supprimé atomiquement avec
  l'offre lors de sa suppression. Il ne peut donc jamais exister d'état où l'offre est supprimée
  mais le retrait resterait possible dessus ; un retrait tenté sur un clic déjà disparu échoue
  proprement en `404`. L'étudiant garde de toute façon un chemin de secours indépendant : supprimer
  directement sa candidature depuis son suivi CRM, peu importe son origine.
- `deactivate`/`activate` restent l'alternative pour retirer une offre du jobboard sans la
  supprimer.

### Employeurs exclus, localisation, visibilité
- **Employeurs exclus** (`excludedEmployers`) : filtrés au moment de la synchronisation, avant même
  l'insertion en base — comparaison insensible à la casse, sous-chaîne.
- **Filtre localisation** : `GET /jobboard/offers` (étudiant) et `GET /jobboard/offers/all`
  (advisor/admin) acceptent un paramètre `location` optionnel (recherche insensible à la casse,
  sous-chaîne sur `location`), disponible côté étudiant comme côté advisor/admin.
- **Visibilité des offres externes** : un advisor peut voir/filtrer par source depuis Offres
  (`source=EXTERNAL` ou une source précise), au même titre qu'un admin. Seule la configuration de
  la synchronisation (activer/désactiver une source, éditer les critères) reste réservée à
  `ADMIN`.

### Secteurs & filtre actif
- **Secteurs** (`Sector`) : CRUD réservé `ADVISOR`/`ADMIN`, label unique (409
  `sector-label-already-exists`), flag `active` bascule sans suppression. Un étudiant ne voit que
  la liste des secteurs actifs (`GET /jobboard/sectors/active/list`).
- **Filtre actif/inactif** (page admin Offres) : `GET /jobboard/offers/all` accepte un paramètre
  `active` optionnel (`true`/`false`/absent = toutes) ; l'interface présélectionne "Actives" par
  défaut.

---

## 4. Gamification — XP & Grades

### Actions XP génériques (table `gamification_config`, éditables sans toucher au code)

| Action | XP par défaut |
|---|---|
| `CANDIDATURE_CREATED` | 10 |
| `QUIZ_COMPLETED` | 40 |

`CANDIDATURE_STATUS_CHANGED` et `CV_VALIDATED` existent dans l'enum `ActionXP` mais **ne sont pas pilotées par une config générique** — elles ne servent que d'étiquette de catégorie dans l'historique XP de l'étudiant ; le montant réel vient respectivement de `ApplicationStatus.gainXP` et `CVStatut.gainXP` (voir sections 2 et 6).

### Grades
- Seedés par défaut : **Débutant** (0 XP, 🌱), **Intermédiaire** (100 XP, 📈), **Avancé** (300 XP, 🚀), **Expert** (700 XP, 🏆).
- Le grade d'un étudiant = le grade avec le seuil `xpMinimum` le plus élevé qui reste ≤ à son XP total (calculé à la volée, jamais stocké).
- CRUD complet (créer/modifier/supprimer) par l'admin/conseiller depuis la page Gamification. Le nom doit être unique.
- Aucune garde-fou si tous les grades sont supprimés : un étudiant peut alors n'avoir aucun grade (affiché "—" côté UI).

### Historique XP (`xp_history`)
- Table d'audit pure, indépendante de toute clé étrangère vers Quiz/Article/Catégorie/Statut — **un historique XP survit toujours** à la suppression du contenu qui l'a généré.

### Classement (tableau de bord étudiant)
- Calculé à la volée, jamais stocké. Tri par **XP total descendant**, rang **1-indexé**.
- **Scope** : si l'étudiant a une promotion, le classement est limité aux étudiants de **cette promotion** ; sinon il est **global** (tous les étudiants de la plateforme).
- Les étudiants désactivés (`active = false`) et les étudiants anonymisés RGPD (`email LIKE '%@rgpd.deleted'`) sont **exclus** du classement.

---

## 5. Skill Tree — Catégories / Articles / Quiz

- Une **catégorie** ne peut être supprimée si elle contient des articles (`category-has-articles`).
- Un **article** ne peut être supprimé s'il a un quiz configuré (`article-has-quiz`) — il faut supprimer le quiz d'abord.
- Un **quiz** ne peut être supprimé si au moins un étudiant l'a déjà validé (`quiz-has-validations`).
- Un article n'a **au plus un** quiz (relation 1:1).

### Notation du quiz
- `scoreMinimum` est un **pourcentage** (0 à 100), pas un nombre de questions — défaut **80**.
- Le score = `(questions entièrement correctes / total des questions) × 100`.
- Une question est "correcte" seulement si l'ensemble des réponses cochées par l'étudiant **correspond exactement** à l'ensemble des réponses marquées vraies — ni plus, ni moins. Cela gère nativement les questions à réponses multiples (pas de demi-point).
- **Un étudiant ne peut valider un quiz qu'une seule fois** (contrainte unique `student_id + quiz_id`). Une nouvelle tentative après validation ne redonne pas l'XP, même si le score recalculé est différent.

---

## 6. CV — Dépôt et validation

- **Dépôt unique & Remplacement** : Un étudiant a **un seul CV actif** (relation 1:1 `student_id` unique). Déposer un nouveau fichier remplace l'ancien. L'action affiche une modale de confirmation indiquant que l'historique et le statut actuel seront réinitialisés, effectue une suppression physique du fichier du stockage Cloud/Local, et recrée une nouvelle entité de CV au statut "En attente".
- **Statuts par défaut** (CRUD complet par l'admin, contrairement aux statuts CRM) : **En attente** (0 XP), **Validé** (30 XP), **À corriger** (0 XP).
- **Gain de points XP** : N'importe quel statut avec `gainXP > 0` attribue l'XP (pas seulement "Validé"), que ce soit atteint via le dépôt initial ou un changement manuel par un conseiller.
- **Sécurité anti-double gain** : Un flag `xpAwarded` empêche de regagner de l'XP en rebasculant entre statuts pour le **même** fichier déposé. Ce flag se réinitialise à `false` à chaque nouveau dépôt de CV, permettant ainsi à un étudiant de remporter de l'XP de validation sur une nouvelle version corrigée.
- **Étapes du Cycle de Validation (Timeline/CycleStrip)** :
  - **Étape 0 (Dépôt du CV)** : Actif dès qu'un fichier PDF est présent.
  - **Étape 1 (Relecture conseiller)** : Actif lorsque le CV est au statut "En attente".
  - **Étape 2 (Statut attribué)** : Actif dès que le conseiller a sélectionné un statut définitif (ex: Validé, À corriger).
  - **Étape 3 (XP gagnés)** : Actif si le statut final a attribué de l'XP (statut validé et `xpAwarded = true`).
- **Commentaires d'évaluation** :
  - Les commentaires rédigés par un conseiller sur le CV d'un étudiant sont récupérés chronologiquement via `/api/cv/comments`.
  - Chaque commentaire affiche le nom complet du conseiller, sa photo de profil, sa fonction, la date au format `JJ/MM/AAAA` et le corps du message.
  - L'ajout d'un commentaire déclenche un email asynchrone d'alerte envoyé directement à l'étudiant concerné.

---

## 7. Limites d'upload de fichiers

| Variable | Défaut | Rôle |
|---|---|---|
| `MAX_FILE_SIZE` | 512MB | Plafond absolu serveur (Spring multipart + Tomcat) |
| `MAX_CV_SIZE_MB` | 10 | Limite CV, vérifiée en code applicatif |
| `MAX_IMAGE_SIZE_MB` | 15 | Limite image |
| `MAX_VIDEO_SIZE_MB` | 500 | Limite vidéo |

Chaque limite spécifique doit rester ≤ `MAX_FILE_SIZE`.

---

## 8. Journal d'audit

- Lecture réservée à `ADMIN` uniquement (pas même les conseillers).
- Actions tracées : `LOGIN`, `LOGOUT`, `STUDENT_REGISTERED`, `STAFF_USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `USER_DEACTIVATED`, `USER_REACTIVATED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_VERIFIED`, `CV_UPLOADED`, `CV_VALIDATED`, `CV_REJECTED`, `CV_DELETED`, `CV_STATUS_UPDATED`, `CV_COMMENTED`, `TUTO_CREATED`, `TUTO_UPDATED`, `TUTO_DELETED`, `PROMOTION_CREATED`, `PROMOTION_UPDATED`, `PROMOTION_DELETED`, `STUDENT_ASSIGNED_TO_PROMOTION`, `STUDENT_REMOVED_FROM_PROMOTION`, `APPLICATION_CONTRACT_VERIFIED`, `APPLICATION_CONTRACT_REJECTED`, `OTHER`.
- **`APPLICATION_CONTRACT_VERIFIED`/`APPLICATION_CONTRACT_REJECTED`** (voir §2, "Suivi sous contrat") : posées à chaque vérification/refus d'une déclaration "sous contrat" par un conseiller/admin ; la description embarque le statut, l'entreprise et l'identité de l'étudiant concerné. Ajoutées via Flyway (`audit_logs_action_check` reconstruite à chaque ajout de valeur d'enum — toujours nécessaire, la contrainte CHECK ne suit pas l'enum Java automatiquement).

---

## 9. Internationalisation (i18n)

- **Gestion des langues** : Support complet du Français (`fr`) et de l'Anglais (`en`).
- **Traduction Frontend** : Tous les libellés statiques, formulaires, messages de validation, timelines et modales sont gérés côté client via `react-i18next`.
- **Changement de langue optimiste** : Lors du changement de langue, la traduction locale s'applique instantanément et les requêtes React Query (comme le tableau de bord) sont invalidées en arrière-plan. La synchronisation avec le profil utilisateur en base de données s'exécute de manière asynchrone sans bloquer l'interface.
- **Traduction Backend** : Les textes dynamiques générés par le serveur (ex: libellés des tâches du tableau de bord étudiant "À faire aujourd'hui") sont traduits à la volée. Le backend résout la langue en lisant prioritairement les en-têtes HTTP de la requête (`x-auth-user-lang` et `Accept-Language`), assurant une synchronisation parfaite avec l'état actif de l'interface client.

---

## 10. Optimisations SQL & JPA Specifications

- **Moteur de filtrage dynamique (JPA Specifications)** :
  - Remplacement des requêtes JPQL complexes et dédupliquées par des **`Specification<T>` composables** pour les modules Etudiants (`StudentSpecification`), Candidatures (`ApplicationSpecification`), CVs (`CVSpecification`) et Offres (`JobOfferSpecification`).
  - Suppression complète du piège du `SELECT DISTINCT` + pagination en mémoire Hibernate.
- **Indexation PostgreSQL Trigramme (Flyway)** :
  - Migrations automatisées au démarrage de Spring Boot via Flyway (`V1__pg_trgm_indexes.sql`).
  - Creation automatique de l'extension `pg_trgm` et d'index GIN trigrammes sur les colonnes de recherche floue textuelle (`ILIKE '%search%'`) : `(first_name || ' ' || last_name)`, `email`, `entreprise` et `poste`.
  - Temps de réponse des filtres et barres de recherche < 5 millisecondes sur la BDD de production.

---

## 11. Configuration Applicative Globale & Rétentions RGPD

- **Contrôle d'accès strict (RBAC)** : Les endpoints d'administration de la configuration applicative (`/api/admin/app-config`) sont protégés par `@PreAuthorize("hasRole('ADMIN')")`. Seul le rôle `ADMIN` peut consulter et enregistrer les modifications de seuils.
- **Seuils applicatifs configurables en BDD (`app_configuration`)** :
  1. **`STALE_ALERT_DAYS`** (par défaut : `10` jours) : Nombre de jours d'inactivité sur une candidature avant l'envoi d'une alerte de relance.
  2. **`PROMOTION_REMINDER_MONTHS`** (par défaut : `9` mois) : Délai en mois avant le rappel de mise à jour de la promotion de l'étudiant.
  3. **`GDPR_OTP_RETENTION_HOURS`** (par défaut : `24` heures) : Durée de rétention des codes de vérification OTP d'inscription.
  4. **`GDPR_AUDIT_LOG_RETENTION_DAYS`** (par défaut : `365` jours) : Conservation légale des journaux d'audit et de sécurité.
  5. **`GDPR_INACTIVE_STUDENT_RETENTION_DAYS`** (par défaut : `1095` jours) : Seuil de rétention des comptes inactifs avant purge/anonymisation.
  6. **`JOBBOARD_SYNC_MAX_PER_PROVIDER`** (par défaut : `300`) : Nombre maximum d'offres récupérées par source externe à chaque synchronisation.
  7. **`JOBBOARD_OFFER_EXPIRATION_DAYS`** (par défaut : `30` jours) : Fenêtre d'expiration calculée pour France Travail/Adzuna (date de dernière mise à jour + ce délai) — sans effet sur La Bonne Alternance, qui fournit sa propre date d'expiration réelle.
  8. **`JOBBOARD_OFFER_DELETE_AFTER_DAYS`** (par défaut : `30` jours) : Délai après expiration avant suppression définitive d'une offre externe en base.
  9. **`APPLICATION_XP_WEEKLY_LIMIT`** (par défaut : `5`) : Nombre maximum de candidatures "postuler" (ITIC ou externe) créditées en XP par étudiant sur une fenêtre glissante de 7 jours.
- **Intégration temps réel** : Toute modification enregistrée dans l'interface "Paramètres" → "Configuration Applicative" est immédiatement prise en compte par les services applicatifs (`StudentDashboardService`, `ApplicationService`, `GdprPurgeScheduler`, `ExternalJobSyncService`) sans redémarrer le serveur.

---

## 12. Emails transactionnels

- Rendus via Thymeleaf (`itic-cre-backend/src/main/resources/templates/email/`), envoyés en asynchrone (`@Async`), jamais bloquants pour la requête HTTP d'origine.

| Template | Déclencheur |
|---|---|
| `otp-verification.html` | Inscription étudiant / renvoi de code OTP |
| `account-credentials.html` | Création d'un compte `ADVISOR`/`ADMIN` par un admin (mot de passe temporaire) |
| `cv-notification.html` (variante statut) | Un conseiller change le statut d'un CV |
| `cv-notification.html` (variante commentaire) | Un conseiller ajoute un commentaire sur un CV |
| `student-reminder.html` | Un conseiller envoie un rappel libre via `POST /dashboard/students/{id}/notify` |
| `contract-declaration-rejected.html` | Un conseiller/admin refuse une déclaration "sous contrat" (`POST /dashboard/applications/{id}/reject-contract`) — seul évènement de la section §2 "Suivi sous contrat" à notifier l'étudiant ; la confirmation (`verify-contract`) n'envoie rien, la déclaration passe juste au vert dans son suivi. |

- **`FRONTEND_URL`** (par défaut : `http://localhost:5173`) : URL de base du frontend, utilisée uniquement pour le lien du bouton "Accéder à mon espace" dans `student-reminder.html` (`{FRONTEND_URL}/student/dashboard`). En production, doit pointer vers le domaine réel du frontend.
- **`APP_BRAND_NAME`** (par défaut : `ITIC CRE`) : nom affiché dans l'en-tête/pied de tous les templates.
- **Thème forcé en dark mode** : tous les templates déclarent `<meta name="color-scheme" content="dark">` / `<meta name="supported-color-schemes" content="dark">` et dupliquent chaque couleur de fond via l'attribut HTML `bgcolor` en plus du CSS inline, pour empêcher les clients mail mobiles (Gmail, Outlook, Apple Mail) d'inverser ou de repasser l'email en clair.

---

## Notes de fiabilité de ce document

- Ce document a été construit en lisant le code source directement (pas le cahier des charges initial, qui contient des écarts connus — ex: grades "Bronze→Platine" jamais implémentés, statuts CRM légèrement différents de la première spec).
- Toute règle ci-dessus peut devenir obsolète si le code évolue sans que ce fichier soit mis à jour en parallèle — en cas de doute, le code reste la source de vérité.
