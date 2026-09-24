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
- **Effacement nominatif** : L'anonymisation RGPD (`GdprService.anonymizeAndDeactivateUser`) remplace l'identité par `"Anonyme Utilisateur RGPD"`, l'email par `deleted_<UUID>@rgpd.deleted`, détruit le mot de passe, désactive le compte (`active = false`), supprime physiquement le fichier CV et détache l'étudiant de toute promotion (`student.setPromotion(null)`).
- **Traçabilité de l'origine de la suppression (`GdprService.DeletionTrigger`)** : la méthode distingue trois déclencheurs pour rester auditable après coup, alors même que l'email/nom sont déjà écrasés au moment où le log est écrit — l'identité d'origine est donc capturée en mémoire **avant** l'anonymisation et injectée dans la description du log :
  - **`SELF`** (auto-suppression, `DELETE /gdpr/delete-account`, toujours initiée par l'utilisateur connecté lui-même — cette route ne résout jamais un `userId` fourni par un tiers) : action d'audit dédiée `STUDENT_SELF_DELETED_GDPR`, distincte de toute désactivation manuelle par un admin.
  - **`SCHEDULED_PURGE`** (purge légale automatique par `GdprPurgeScheduler`, comptes désactivés depuis plus de `GDPR_INACTIVE_STUDENT_RETENTION_DAYS`) : reste loggée sous `USER_DEACTIVATED` avec une description explicite mentionnant la purge automatique.
  - **`STAFF_INITIATED`** (suppression du compte d'un étudiant par un **admin uniquement**, `PATCH /gdpr/students/{id}/anonymize`, jamais un conseiller) : action d'audit dédiée `STUDENT_ANONYMIZED_BY_STAFF`, l'admin acteur est tracé. Refusée sur un compte non étudiant (`STAFF_ANONYMIZE_STUDENTS_ONLY`) ou déjà anonymisé (`ACCOUNT_ALREADY_ANONYMIZED`). Confirmation renforcée côté admin : la modale exige de retaper l'email de l'étudiant avant d'activer le bouton. Affichée "Supprimer le compte" dans l'interface.
  - Confirmation renforcée côté étudiant avant l'auto-suppression : le bouton "Oui, supprimer mon compte" reste désactivé tant que l'utilisateur n'a pas retapé le mot de confirmation ("SUPPRIMER" / "DELETE" selon la langue) dans la modale.
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

### Vocabulaire : compte actif ≠ étudiant actif ≠ étudiant inactif

Trois états distincts, à ne pas confondre (backend `StudentRow` : `accountActive` / `isActive` / `lastActivity`) :
- **Compte désactivé** (`accountActive = false`) : désactivé par un conseiller/admin (ou anonymisé RGPD, toujours désactivé) — l'étudiant ne peut plus se connecter. Badge gris "Compte désactivé". C'est ce que filtre `activeStudentsOnly` (page Candidatures, compteur "à vérifier").
- **Actif** (`isActive = true`) : compte ouvert **et** connexion dans les `INACTIVE_STUDENT_DAYS` derniers jours (défaut 14, configurable). Badge vert "Actif".
- **Inactif** (`isActive = false`, compte ouvert) : aucune connexion depuis plus de `INACTIVE_STUDENT_DAYS` jours. Le badge affiche la durée écoulée depuis la dernière connexion, en jours (< 60 j), en mois (< 2 ans) puis en années — "Inactif depuis 3 mois" — ou "Jamais connecté" si aucune connexion n'a jamais eu lieu. Un étudiant inactif reste visible partout (Candidatures, "à vérifier"…) : seule la désactivation du compte le masque.
- **Isoler les comptes désactivés** : la liste Étudiants les affiche mélangés aux autres (seuls les comptes anonymisés RGPD sont masqués, sauf case admin dédiée). Le filtre "Comptes désactivés" de la page envoie `accountActive=false` (`GET /dashboard/students` et `/students/all`) ; `accountActive` porte sur l'état du compte, indépendamment de `isActive` (un compte désactivé qui s'est connecté hier reste "Actif" côté connexion, donc visible sous le filtre "Actifs").
- Le badge est le composant partagé `StudentActivityBadge` (tableau Étudiants, fiche étudiant, page d'une promotion). Les filtres du tableau Étudiants disent "Actifs (connexion récente)" / "Inactifs (sans connexion récente)".

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

### Note manuelle conseiller/admin (`Student.starRating`)
- Note libre de **0 à 3 étoiles**, saisie manuellement par un conseiller ou admin sur la fiche étudiant (`StudentDetailModal`) — délibérément **pas de calcul automatique** ni de référentiel de critères structuré, pour éviter les problématiques RGPD/équité d'un score dérivé du comportement de l'étudiant.
- **Jamais visible ni modifiable côté étudiant** — champ absent de toute réponse API accessible à un rôle `STUDENT`.
- `null` = jamais noté, distinct d'une note explicite de **0** (un conseiller peut délibérément noter 0 étoile).
- `PATCH /dashboard/students/{studentId}/star-rating` (`ADVISOR`/`ADMIN`, ouvert à tout conseiller/admin comme les autres actions de ce contrôleur) — `starRating: null` efface la note.
- Filtrable dans la liste des étudiants (`starred=true/false` sur `GET /dashboard/students` et `/dashboard/students/all`) : `true` = a une note (0 à 3), `false` = jamais noté.

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

### Suivi "sous contrat" (déclaration étudiante/conseiller + validation conseiller)
- **Deux façons de déclarer un contrat** : (1) parcours normal — `ApplicationStatus.compteCommeContrat` marque un statut comme "vaut contrat" (seul "Offre reçue" par défaut), l'étudiant y fait passer une candidature existante via `PATCH /applications/{id}/status` ; (2) déclaration directe, sans passer par le pipeline de candidature — `POST /applications/declare-contract` (étudiant, pour lui-même) ou `POST /dashboard/students/{id}/declare-contract` (conseiller/admin, au nom d'un étudiant, **confirmée immédiatement** puisque c'est le conseiller qui atteste). Une date de début (`Application.startDate`) est **obligatoire** pour atteindre un statut `compteCommeContrat` (`APPLICATION_CONTRACT_START_DATE_REQUIRED` sinon), une date de fin (`endDate`) est optionnelle.
- **Validation par un conseiller/admin** : `Application.contractVerified` (`false` par défaut, remis à `false` à chaque **nouvelle** déclaration `compteCommeContrat`) distingue une déclaration en attente d'une déclaration confirmée. Actions dédiées, réservées `ADVISOR`/`ADMIN`, **ouvertes à n'importe quel conseiller/admin** (pas seulement celui affecté à l'étudiant — même philosophie que les autres actions conseiller : relance, CV, promotion...) :
  - `POST /dashboard/applications/{id}/validate-contract` : marque `contractVerified = true`.
  - `POST /dashboard/applications/{id}/invalidate-contract` : la déclaration était fausse — revient au statut précédent (comme un retour en arrière fait par l'étudiant) et révoque l'XP gagné entre-temps. Seule action du flux qui notifie l'étudiant par email (voir §12) — la validation, elle, ne déclenche aucun email, seul le badge de son suivi passe au vert.
  - `PATCH /dashboard/applications/{id}/contract-dates` : modifie les dates ; toucher les dates vaut confirmation implicite (`contractVerified` passe à `true`). Sert aussi de **"marquer comme terminé"** : renseigner uniquement une `endDate` passée (en renvoyant la `startDate` existante) fait sortir un contrat réellement obtenu de "sous contrat" **sans** rollback de statut ni reprise d'XP — à distinguer d'`invalidate-contract`, qui annule une déclaration jugée fausse.
  - Actions journalisées : `APPLICATION_CONTRACT_VALIDATED`, `APPLICATION_CONTRACT_INVALIDATED`, `APPLICATION_CONTRACT_DECLARED_BY_ADVISOR` (voir §8).
- **Verrou une fois validé** : une fois `contractVerified = true`, les endpoints génériques de l'étudiant (`update`, `changeStatus`, `delete`) refusent toute modification de cette candidature (`APPLICATION_CONTRACT_VERIFIED_LOCKED`) — seul le conseiller garde la main (`contract-dates`/`invalidate-contract`). Empêche un étudiant de rouvrir silencieusement un contrat validé (ex : effacer sa date de fin) ou de le modifier sans repasser par une revalidation.
- **Invariants structurels** (bloquants, jamais un simple avertissement) : un étudiant ne peut jamais avoir **deux déclarations "à valider" simultanées** (`APPLICATION_CONTRACT_ALREADY_PENDING` si on tente d'en créer une deuxième), ni **deux contrats validés actifs simultanément** (`APPLICATION_CONTRACT_ALREADY_ACTIVE` si on tente d'en valider un deuxième pendant qu'un autre est encore actif — il faut d'abord invalider l'existant ou lui donner une date de fin). Il peut en revanche avoir **plusieurs contrats validés dans le temps** (historique), tant qu'un seul est actif à la fois.
- **Pas de cumul de postes** : seule la **dernière** déclaration `compteCommeContrat` en date (`startDate` le plus récent pour cet étudiant, **parmi les déclarations validées** — voir bug corrigé ci-dessous) compte comme "sous contrat".
- **"Sous contrat" (`underContract=true`, filtre/stat/badge)** = dernière déclaration **validée**, et pas de date de fin déjà passée (`endDate IS NULL OR endDate >= aujourd'hui`). Ne nécessite **pas** que la date de début soit déjà atteinte. Filtre disponible sur `GET /dashboard/students`, `GET /dashboard/students/all` et `GET /dashboard/applications/grouped-by-student`.
- **Exclusion par défaut (`underContract=false`)** ne s'applique qu'aux déclarations **déjà validées** — une déclaration encore en attente reste visible dans la vue par défaut (avec son badge "À valider"), pour que le conseiller la découvre sans devoir changer de filtre.
- **Besoin de validation (`studentsNeedingContractVerificationCount`, badge "À valider")** = dernière déclaration `compteCommeContrat`, **non validée**, parmi **toutes** les déclarations (validées ou non) — volontairement pas restreint aux seules déclarations validées, sinon une déclaration en attente ne serait plus détectée dès qu'une autre (validée) existe pour le même étudiant. Sans aucune contrainte de date (ni début ni fin). Filtre dédié `needsContractVerification=true` sur `GET /dashboard/students`, `.../students/all` et `.../applications/grouped-by-student` (axe orthogonal à `underContract`). **Périmètre du compteur (badge sidebar, tuile du tableau de bord) = étudiants actifs uniquement** (`a.student.active = true` ; un compte anonymisé RGPD est toujours désactivé), le même que la liste "À vérifier" de la page Candidatures (`activeStudentsOnly`) : sans cela, la déclaration d'un étudiant désactivé ou parti restait comptée dans le badge sans jamais apparaître dans la liste, donc impossible à traiter (badge à 1, liste vide).
- **Bug corrigé (2026-09-14/15)** : la comparaison "dernière déclaration" portait initialement sur `MAX(startDate)` parmi *toutes* les déclarations `compteCommeContrat`, validées ou non — une déclaration plus récente mais non validée masquait alors une déclaration plus ancienne mais réellement validée et active (aucune des deux ne remplissait toutes les conditions à la fois). Deux constantes désormais distinctes côté backend : `LATEST_VERIFIED_CONTRACT_START_DATE` (ne considère que les déclarations validées, utilisée pour tout ce qui touche à "sous contrat") et `LATEST_CONTRACT_START_DATE` (toutes déclarations, utilisée uniquement pour "besoin de validation").
- **Migration de rattrapage (V28)** : une candidature déjà "Offre reçue" avant l'existence de ce suivi a reçu `start_date = NULL` (colonne ajoutée sans backfill par V24). `V28__backfill_contract_start_dates.sql` comble le trou : pour toute candidature `compte_comme_contrat=true` avec `start_date` encore NULL, la date est déduite de la dernière transition vers ce statut (`application_history`), ou à défaut de `date_modification`.
- **Repère visuel "contrat actuel"** : côté étudiant (`Terminées`) comme côté conseiller (fiche/drawer étudiant), un badge distinct "Contrat actuel" signale la candidature validée et encore active, distincte des candidatures refusées et des contrats validés mais déjà terminés — purement calculé côté frontend à partir de `status.compteCommeContrat`/`contractVerified`/`endDate`, aucun champ dédié côté backend.
- **Dashboard conseiller** : la carte d'alerte (`/dashboard/overview`) affiche les candidatures stagnantes et les contrats à valider **dans la même carte**, empilés l'un sous l'autre si les deux comptes sont non nuls (pas deux cartes distinctes) ; carte neutre "Tout est à jour !" uniquement si les deux compteurs sont à zéro.

---

## 3. Jobboard — Offres d'emploi

### Sources d'offres
Une offre (`JobOffer.source`) vient soit de `MANUAL` (créée par un `ADVISOR`/`ADMIN` depuis
l'interface ITIC), soit d'une des 3 sources externes agrégées automatiquement : `FRANCE_TRAVAIL`,
`ADZUNA`, `BONNE_ALTERNANCE`. Toutes les offres — quelle que soit leur source — vivent dans la même
table et sont traitées de façon identique pour la recherche, le filtrage et la candidature ; seule
la synchronisation et l'expiration diffèrent par source (voir plus bas).

### Tri par défaut
Les listes d'offres (`/jobboard/offers`, `/jobboard/offers/all` et les endpoints de recherche) sont
triées par défaut sur `JobOffer.priorityContract` puis `JobOffer.effectiveDate`, tous deux
décroissants (`Sort.by(DESC, "priorityContract", "effectiveDate")`, deux champs calculés) :
- `effectiveDate` = `coalesce(published_at, created_at)` — la date réelle de publication chez la
  source externe, ou la date de création pour une offre `MANUAL` (`published_at` toujours `null`
  pour celles-ci). Trier sur `createdAt` seul aurait regroupé les offres par lot de synchronisation
  (toutes celles d'une même source insérées au même instant se retrouvent contiguës) plutôt que par
  ordre chronologique réel d'apparition, entrelacé entre les sources.
- `priorityContract` = `1` si le type de contrat est `Stage` ou `Alternance`, `0` sinon — fait
  passer ces offres avant toute offre CDI/CDD, même plus récente ; le tri par date reste appliqué
  à l'intérieur de chaque groupe (le plus récent Stage/Alternance en tête, puis le plus récent
  CDI/CDD). Reflète la même priorité que celle déjà appliquée côté quota de synchronisation
  France Travail (2/3 alternance+stage / 1/3 CDI+CDD, voir `FranceTravailProvider.SEARCH_BUCKETS`).

### Critères de recherche des sources externes — 100% configurables en base, jamais codés en dur
Chaque source a une ligne dans `external_source_configs` (`enabled`, `romeCodes`, `departments`,
`keywords`, `category`), éditable par un `ADMIN` depuis Offres → Offres externes,
**sans redéploiement**.

- `romeCodes`/`departments` : pertinents pour `FRANCE_TRAVAIL` et `BONNE_ALTERNANCE` (les deux
  exposent la taxonomie ROME officielle).
- `keywords`/`category` : pertinents pour `ADZUNA` (pas de taxonomie ROME côté Adzuna).
- **Règle absolue** : un critère non configuré (`null`/vide en base) signifie **aucune
  restriction** sur ce critère, jamais un repli silencieux sur une valeur par défaut codée en dur.
  Vérifié en direct contre les APIs réelles : omettre `codeROME` chez France Travail renvoie bien
  toutes professions confondues, pas un sous-ensemble caché.

`excludedEmployers` (liste noire d'employeurs) n'est **pas** un critère par source : c'est un
réglage global unique dans `jobboard_sync_settings` (une ligne `GLOBAL`, comme
`scheduledSyncEnabled`), édité une seule fois et appliqué aux 3 sources — voir plus bas.

### Synchronisation
- Déclenchée automatiquement (`jobboard.sync.cron`, tous les jours à 2h par défaut) ou
  manuellement (`POST /jobboard/admin/external/sync`, `ADMIN` uniquement, réponse `202 Accepted` —
  asynchrone).
- **Fréquence configurable (`jobboard_sync_settings.sync_interval_days`)** : le cron continue de
  "tick" chaque jour à l'heure configurée, mais `ExternalJobSyncService.scheduledSync()` ne lance
  réellement `syncAll()` que si au moins `syncIntervalDays` jours se sont écoulés depuis la fin de
  la dernière synchro (`SyncLog.finishedAt`) — `PUT /jobboard/admin/external/scheduled-sync/interval`
  (`ADMIN`). Permet une synchro tous les 2, 3, 7 jours... sans reconfigurer le cron Spring lui-même
  (non modifiable à chaud). N'a pas d'effet si `scheduledSyncEnabled` est désactivé.
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
- **Employeurs exclus** (`excludedEmployers`, `PUT /jobboard/admin/external/excluded-employers`) :
  liste noire **globale** (comparaison insensible à la casse, sous-chaîne), filtrée au moment de la
  synchronisation, avant même l'insertion en base — pour les 3 sources externes à la fois, à partir
  d'une seule saisie admin (ex : `ISCOD,CFA ITIS`) plutôt que répétée par source.
- **Purge immédiate à l'enregistrement** : au-delà du filtrage à la synchronisation, mettre à jour
  la liste noire supprime aussi sur-le-champ les offres externes déjà en base dont l'employeur
  matche — sans ça un employeur nouvellement exclu resterait visible jusqu'à l'expiration naturelle
  de ses offres (jusqu'à 60 jours par défaut). Même garantie que `toggleSource` : les clics
  "postuler" liés (`JobApplication`, FK `NOT NULL`) sont purgés d'abord, les candidatures CRM liées
  survivent juste détachées (`sourceJobOffer` en `ON DELETE SET NULL`). Offres `MANUAL` jamais
  concernées.
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
- **Libellé de grade par entrée** : chaque `RankingEntryDTO` du top 3 porte son propre grade (`gradeLabel`/`gradeIcon`, résolu via `GamificationService.getCurrentGrade` sur l'XP de l'entrée), pas seulement l'XP brut.
- **Sa propre ligne au-delà du top 3** : si le rang de l'étudiant connecté est `> 3`, une 4e entrée lui est ajoutée à la suite du top 3, avec son vrai rang (`rank`) et `isMe = true` — il se voit ainsi dans la liste elle-même, pas seulement dans la phrase "Tu es #6 sur 156" au-dessus. S'il est déjà dans le top 3, aucune ligne supplémentaire n'est ajoutée.

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
- Actions tracées : `LOGIN`, `LOGOUT`, `STUDENT_REGISTERED`, `STAFF_USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `USER_DEACTIVATED`, `USER_REACTIVATED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_VERIFIED`, `CV_UPLOADED`, `CV_VALIDATED`, `CV_REJECTED`, `CV_DELETED`, `CV_STATUS_UPDATED`, `CV_COMMENTED`, `TUTO_CREATED`, `TUTO_UPDATED`, `TUTO_DELETED`, `PROMOTION_CREATED`, `PROMOTION_UPDATED`, `PROMOTION_DELETED`, `STUDENT_ASSIGNED_TO_PROMOTION`, `STUDENT_REMOVED_FROM_PROMOTION`, `APPLICATION_CONTRACT_VALIDATED`, `APPLICATION_CONTRACT_INVALIDATED`, `APPLICATION_CONTRACT_DECLARED_BY_ADVISOR`, `STUDENT_SELF_DELETED_GDPR`, `STUDENT_ANONYMIZED_BY_STAFF`, `ALUMNI_CONTACT_DELETED` (voir §13), `OTHER` (`APPLICATION_CONTRACT_VERIFIED`/`APPLICATION_CONTRACT_REJECTED` restent dans l'enum et la contrainte CHECK pour la lecture des lignes historiques antérieures au renommage valider/invalider, mais ne sont plus jamais écrites).
- **`APPLICATION_CONTRACT_VALIDATED`/`APPLICATION_CONTRACT_INVALIDATED`/`APPLICATION_CONTRACT_DECLARED_BY_ADVISOR`** (voir §2, "Suivi sous contrat") : posées à chaque validation/invalidation d'une déclaration "sous contrat" par un conseiller/admin, ou déclaration directe au nom d'un étudiant ; la description embarque le statut, l'entreprise et l'identité de l'étudiant concerné. Ajoutées via Flyway (`audit_logs_action_check` reconstruite à chaque ajout de valeur d'enum — toujours nécessaire, la contrainte CHECK ne suit pas l'enum Java automatiquement).

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
  10. **`GDPR_ALUMNI_RETENTION_DAYS`** (par défaut : `1095` jours, soit 3 ans ; 1 à 36500, soit 100 ans : volontairement pas de plafond restrictif, les fiches sont des archives) : Durée de conservation d'une fiche alumni (voir §13), comptée depuis son envoi ; les fiches plus anciennes sont supprimées chaque nuit par `GdprPurgeScheduler`.
  11. **`INACTIVE_STUDENT_DAYS`** (par défaut : `14` jours ; 1 à 365) : nombre de jours sans connexion au-delà duquel un étudiant est "inactif" (voir "Vocabulaire" en §1). Sans effet sur l'état du compte.
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
| `contract-declaration-invalidated.html` | Un conseiller/admin invalide une déclaration "sous contrat" (`POST /dashboard/applications/{id}/invalidate-contract`) — seul évènement de la section §2 "Suivi sous contrat" à notifier l'étudiant ; la validation (`validate-contract`) n'envoie rien, la déclaration passe juste au vert dans son suivi. Bilingue (`lang` de l'étudiant, comme `advisor-assigned.html`). |

- **`FRONTEND_URL`** (par défaut : `http://localhost:5173`) : URL de base du frontend, utilisée uniquement pour le lien du bouton "Accéder à mon espace" dans `student-reminder.html` (`{FRONTEND_URL}/student/dashboard`). En production, doit pointer vers le domaine réel du frontend.
- **`APP_BRAND_NAME`** (par défaut : `ITIC CRE`) : nom affiché dans l'en-tête/pied de tous les templates.
- **Thème forcé en dark mode** : tous les templates déclarent `<meta name="color-scheme" content="dark">` / `<meta name="supported-color-schemes" content="dark">` et dupliquent chaque couleur de fond via l'attribut HTML `bgcolor` en plus du CSS inline, pour empêcher les clients mail mobiles (Gmail, Outlook, Apple Mail) d'inverser ou de repasser l'email en clair.

---

## 13. Formulaire public alumni

Formulaire **sans connexion** (`/alumni` côté frontend, `POST /public/alumni` côté backend) où un ancien d'ITIC Paris laisse ses coordonnées et sa situation professionnelle. Les fiches sont consultées par les conseillers/admins dans le menu **Alumni** (`/supervisor/alumni`).

### Accès
- Lien "Formulaire alumni" depuis la page de connexion (barre en haut à droite de l'`AuthLayout`) et depuis la sidebar de la plateforme, quel que soit le rôle (étudiant, conseiller, admin) — ouvert dans un nouvel onglet depuis la plateforme. La route `/alumni` est volontairement hors `AuthLayout` (qui redirige tout utilisateur connecté vers son dashboard).

### Champs et logique conditionnelle (validée côté serveur, pas seulement dans le formulaire)
- Obligatoires : nom, prénom, email, année de sortie (1980 → année en cours + 1), formation suivie (texte libre, ≤ 150 car.), statut actuel, et **les deux consentements** (RGPD général + recontact pour recommander des alternants — cases distinctes, toutes deux requises pour envoyer).
- Facultatifs : téléphone, prétention salariale (texte libre).
- Statut : `CDI`, `CDD`, `ALTERNANCE`, `STAGE`, `FREELANCE` (= "en activité"), `JOB_SEARCH`, `TRAINING`, `OTHER`.
  - **En activité** : entreprise, poste et "dans la continuité d'une formation ITIC Paris ?" (oui/non) sont requis ; si oui, la formation concernée est requise aussi.
  - **Autre statut** : ces champs sont **ignorés** (jamais stockés), même s'ils sont envoyés.
- `formation` reste du texte libre : les `Promotion` existantes sont des cohortes datées ("Bachelor RH 2024-2025"), inutilisables comme référentiel de formations.

### Doublons et anti-abus
- Email normalisé (trim + minuscules), unique en base (`alumni_contacts.email`). Un email déjà connu reçoit **la même réponse de succès** sans rien écraser : une route publique ne doit ni permettre d'écraser la fiche d'un tiers, ni révéler qu'un email est enregistré. Modifier sa fiche demanderait une vérification de l'email (non implémentée).
- Champ piège (`website`, hors écran) : rempli = robot, réponse de succès mais rien n'est stocké.
- Limitation de débit en mémoire (`FixedWindowRateLimiter`, réinitialisée au redémarrage) : `app.public-form.rate-limit.per-ip` (défaut 5), `.global` (défaut 100) par fenêtre de `.window-minutes` (défaut 60) → `429 TOO_MANY_REQUESTS`. L'IP est la **dernière** entrée de `X-Forwarded-For` (ajoutée par le proxy le plus proche ; la première est falsifiable). Ce limiteur ne protège **que** ce formulaire : `/auth/login`, `/auth/register`, `/auth/otp/send` et `/auth/reset-password` n'en ont aucun.

### RGPD
- Consentements stockés avec la version du texte affiché (`consent_version`, actuellement `v1` — à incrémenter dans `AlumniContactService.CONSENT_VERSION` si le texte de consentement change).
- La politique de confidentialité (`/privacy`) mentionne cette collecte (données, finalités, ligne de conservation) et explique l'exercice des droits sans compte : demande par email au contact indiqué, correction = suppression puis nouvel envoi (aucune édition de fiche n'existe). Conservation : `GDPR_ALUMNI_RETENTION_DAYS` (défaut 3 ans après l'envoi, modifiable par un admin dans "Configuration Applicative") ; `GdprPurgeScheduler` (03:00 chaque nuit) supprime les fiches plus anciennes (`AlumniContactService.purgeExpired`) et écrit **un seul** log `ALUMNI_CONTACT_DELETED` agrégé (nombre de fiches, sans donnée personnelle, sans acteur). La ligne de conservation de la politique de confidentialité affiche la valeur par défaut (3 ans) en dur : la mettre à jour si la durée configurée change durablement.
- Droit à l'effacement : suppression réelle (pas d'anonymisation, aucun compte lié) par un **admin uniquement** (`DELETE /dashboard/alumni/{id}`), tracée `ALUMNI_CONTACT_DELETED` sans donnée personnelle dans la description.

### Consultation (conseillers et admins)
- `GET /dashboard/alumni` paginé (20 par page, plus récentes d'abord), filtres : recherche (nom, email, formation, entreprise, poste), année de sortie, situation. Les conseillers voient toutes les fiches (pas de notion de portefeuille : un alumni n'a pas de conseiller référent).

---

## Notes de fiabilité de ce document

- Ce document a été construit en lisant le code source directement (pas le cahier des charges initial, qui contient des écarts connus — ex: grades "Bronze→Platine" jamais implémentés, statuts CRM légèrement différents de la première spec).
- Toute règle ci-dessus peut devenir obsolète si le code évolue sans que ce fichier soit mis à jour en parallèle — en cas de doute, le code reste la source de vérité.
