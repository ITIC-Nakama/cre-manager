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
- **Adresse postale obligatoire** (lot 10, V62) : rue, code postal (exactement 5 chiffres) et ville ; complément facultatif. Voir §24.

### Comptes admin/conseiller créés par un admin
- Créés avec un **mot de passe temporaire** et `mustChangePassword = true`.
- Tant que `mustChangePassword = true`, **tous les endpoints sont bloqués (403 `password-change-required`) sauf** `POST /auth/change-password` et `POST /auth/logout`.
- Pas d'OTP pour ces comptes (`emailVerified = true` directement).
- Un email contenant le mot de passe temporaire est envoyé automatiquement (**asynchrone**, `@Async`) à la création du compte.
- **Réinitialisation / modification de mot de passe par un tiers interdite pour les comptes `ADMIN`** (`ADMIN_PASSWORD_RESET_FORBIDDEN`, HTTP 403) — un admin ne peut pas réinitialiser le mot de passe d'un autre admin via l'interface ou l'API.

### Gouvernance Multi-Admin & Désactivation RBAC
- **Plafond d'administrateurs actifs** : Limité à 4 admins actifs simultanément (`ADMIN_MAX_ACTIVE`, 4 par défaut depuis le lot 10 : trois admins et une place de secours). Tout ajout ou réactivation d'un 5ème admin est bloqué avec `ADMIN_CAP_REACHED`. Si la variable `ADMIN_MAX_ACTIVE` est présente dans le `.env` d'un environnement, c'est elle qui fait foi.
  - L'écran de gestion des admins lit la limite et le nombre d'admins actifs sur `GET /auth/admin/governance` (admins uniquement) : le bandeau « Gouvernance » affiche la valeur de la configuration, jamais un chiffre écrit dans le front.
  - Plafond atteint : le clic sur « Créer un admin » ou sur « Réactiver » d'un admin ouvre **tout de suite** la fenêtre de refus, sans formulaire à remplir. Le contrôle côté serveur (`ADMIN_CAP_REACHED`, sous verrou) reste en place ; s'il refuse quand même (plafond atteint entre-temps), la même fenêtre s'affiche.
- **Règles de désactivation par rôle** :
  - **`ADMIN`** : Peut désactiver des comptes étudiants, conseillers et administrateurs.
  - **`ADVISOR`** : Peut désactiver **uniquement** des comptes étudiants (`STUDENT`). Toute tentative de désactiver un conseiller ou admin renvoie **403 Access Denied**.
- **Règles de réactivation par rôle** (`PATCH /auth/users/{id}/reactivate`) :
  - **`ADVISOR`** : réactive **uniquement** des comptes étudiants, y compris hors de son portefeuille (comme pour la désactivation). Un compte conseiller ou admin renvoie **403 `ACCESS_DENIED`**.
  - **`ADMIN`** : réactive tous les comptes (étudiants et staff, page admin des conseillers), dans la limite du plafond d'admins actifs (`ADMIN_CAP_REACHED`).
  - **`STUDENT`** : jamais (403) ; un compte désactivé est de toute façon refusé dès le filtre JWT (401 `ACCOUNT_DEACTIVATED`).
  - Un compte **anonymisé RGPD** n'est jamais réactivable (403 `ANONYMIZED_USER_CANNOT_BE_REACTIVATED`).
  - Effets : `active = true`, `deactivatedAt` remis à vide (ce qui arrête le décompte de la purge RGPD des comptes désactivés), entrée `USER_REACTIVATED` au journal d'audit. L'étudiant peut se reconnecter, et ses CV reviennent dans la validation des CV avec leur statut.
  - **Email à l'étudiant** : un compte **étudiant** réactivé reçoit « Votre compte … est de nouveau actif » (modèle `account-reactivated.html`, en français, ou en anglais si l'étudiant a choisi l'anglais), avec un lien vers la page de connexion et un rappel de « Mot de passe oublié ». Envoi asynchrone après validation de la transaction (`StudentAccountReactivatedEvent`) : rien ne part si la réactivation échoue. Pas d'email pour un compte staff réactivé par l'admin.
  - Interface : bouton « Réactiver le compte » sur la fiche étudiant (page Étudiants, candidats d'une offre) et sur chaque ligne de la vue « Comptes désactivés » de la validation des CV. Il ouvre toujours une **confirmation** (verte), comme la désactivation.
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
- **Compte désactivé** (`accountActive = false`) : désactivé par un conseiller/admin (ou anonymisé RGPD, toujours désactivé) — l'étudiant ne peut plus se connecter. Badge gris "Compte désactivé". C'est ce que filtre `activeStudentsOnly` (page Candidatures, compteur "à vérifier"), ainsi que la page « Validation des CVs » (voir §6).
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

### Note de l'équipe sur la fiche étudiant (V53, `student_ratings`)
- Note de **1 à 5** avec un **commentaire facultatif** (1000 caractères au plus), saisie par un conseiller ou un admin sur la fiche étudiant (bloc « Note de l'équipe »). Délibérément **pas de calcul automatique** ni de référentiel de critères : c'est une appréciation humaine.
- **Historisée** : chaque note est une ligne (`student_ratings` : auteur, date, note, commentaire) ; rien n'est écrasé. La fiche montre la dernière et l'historique (« N note(s) plus ancienne(s) »). Auteur supprimé : la note reste, signée « Ancien conseiller ».
- `students.latest_rating` garde la dernière note (colonne triable « Note » de la liste Étudiants, filtre « note minimale » : `minRating=2..5` sur `GET /dashboard/students`). `starred=true/false` signifie désormais « noté / jamais noté ».
- `GET` et `POST /dashboard/students/{studentId}/ratings` (`ADVISOR`/`ADMIN`, tout conseiller ou admin). Note hors 1–5 ou commentaire trop long : 400 `student-rating-invalid`.
- **Jamais visible ni modifiable côté étudiant** : absente de toute réponse accessible au rôle `STUDENT`.
- **Reprise des anciennes étoiles** (0 à 3, `Student.starRating`) : chaque étudiant noté reçoit une note `étoiles + 2` (0 → 2/5, 3 → 5/5), avec le commentaire « Reprise de l'ancienne note : N étoile(s) sur 3 ». L'ancien `PATCH …/star-rating` reste accepté et alimente aussi `latest_rating`.
- **RGPD** : notes incluses dans l'export (`ratings`), supprimées avec le compte (anonymisation).

### Réactiver un compte étudiant (conseiller ou admin)
- Un conseiller (même non référent) ou un admin réactive un étudiant désactivé **depuis sa fiche et depuis la liste Étudiants** (bouton sur la ligne, avec confirmation), comme depuis « Validation des CVs ». Même chemin serveur dans les trois cas : e-mail « compte réactivé » à l'étudiant, entrée `USER_REACTIVATED` au journal d'audit. Un conseiller ne réactive jamais un compte conseiller ou admin.

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
- **CV à corriger (`CV_TO_CORRECT`)** : Ajouté si le conseiller a attribué le statut "À corriger" au CV de l'étudiant (Libellé : *"Corriger votre CV"*). Le statut est reconnu par son **code technique `A_CORRIGER`** (`cv_statuts.code`, V47), pas par son nom : l'admin peut le renommer sans casser la tâche. Le bandeau « Action requise sur votre CV » du tableau de bord suit la même règle (il s'affiche quand cette tâche est présente).

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

**Libellé affiché** (13/11/2026, demande de Jules) : les offres `MANUAL` s'appellent **« Exclusivité ITIC PARIS »**
(anglais : « ITIC PARIS Exclusive ») dans l'interface : onglet de l'étudiant, compteur (« 121 offres en exclusivité
ITIC Paris »), filtre « Source » et fenêtre « Tout supprimer » côté staff. Seuls les libellés changent : la valeur
`MANUAL` en base et dans l'API, les clés de traduction et les routes restent les mêmes.

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
- **Tableau de gestion des offres (page conseiller/admin "Offres d'emploi")** : ouvert par défaut trié par
  **nombre de candidatures décroissant** (`sort=applicationCount,desc` envoyé par la page ; l'utilisateur peut
  changer de colonne). Comme beaucoup d'offres ont 0 candidature, `GET /jobboard/offers/all` complète tout tri
  demandé par `effectiveDate` décroissant puis `id` (`StablePageable.withTieBreakers`) : sans départage, l'ordre
  des offres à égalité varie d'une requête à l'autre et le défilement infini (une requête par page) affiche une
  offre en double ou en saute une. Le tri demandé reste toujours prioritaire.

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

### Élargissement, dédoublonnage entre sources et agrégateur (V58, lot 5 ; détail : `docs/JOBBOARD_SOURCES_AUDIT.md`)
- **Codes ROME des formations ITIC** : deux réglages globaux (`jobboard_sync_settings`), activés par défaut et modifiables dans Offres → Offres externes.
  - « Ajouter les codes ROME des formations ITIC » : France Travail et La Bonne Alternance cherchent les codes de l'admin **plus** ceux des formations visibles de l'Espace entreprise.
  - « Île-de-France par défaut » : sans zone saisie pour une source, recherche en région 11 (France Travail), dans les départements 75 à 95 (La Bonne Alternance) ou avec `where=Ile-de-France` (Adzuna).
  - La règle « non configuré = aucune restriction » s'applique toujours quand ni l'admin ni les formations ne donnent de critère, ou quand les réglages sont décochés.
- **La Bonne Alternance** : un appel par paquet de 10 codes ROME, chacun avec son plafond (l'API n'a pas de pagination).
- **Type de contrat d'une offre France Travail** (PR #97) : il vient d'abord de la **nature du contrat** (`natureContrat` : « Contrat apprentissage », « Cont. professionnalisation », ou les codes E2 / FS). Apprentissage et professionnalisation donnent **« Alternance »**, quel que soit l'intitulé. En secours seulement, l'intitulé : « stage / stagiaire » donne « Stage », un mot d'alternance (alternance, alternant, apprenti, professionnalisation) donne « Alternance ». Sinon, c'est la durée (`typeContratLibelle` : CDI, CDD…). Avant, seul l'intitulé comptait : une offre d'apprentissage sans le mot dans son titre était enregistrée en CDD.
  - **Offres déjà en base** : à chaque synchro, une offre France Travail connue (même identifiant) que l'API classe en alternance mais enregistrée autrement passe en « Alternance ». Seul ce passage est fait : jamais l'inverse, aucun autre champ, aucune alerte, et rien pour les autres sources. Le journal de synchro compte ces offres (« déjà connues passées en alternance »).
- **Dédoublonnage entre sources** : à la synchronisation, une offre dont l'entreprise, l'intitulé et la ville correspondent à une offre déjà active n'est pas recopiée, quelle que soit sa source (équipe comprise). La comparaison ignore accents, majuscules, ponctuation, code postal et « (e) ». Le journal de synchronisation compte ces doublons par source.
- **JSearch** (RapidAPI), **désactivé par défaut** :
  - activation : `JOBBOARD_JSEARCH_ENABLED` et `JOBBOARD_JSEARCH_API_KEY` ;
  - plafond mensuel d'appels compté en base (`provider_api_usage`, `JOBBOARD_JSEARCH_MONTHLY_CALL_CAP`, 100 par défaut) ;
  - éditeurs exclus : « Indeed » par défaut ;
  - recherche « télétravail » : seule source à filtrer le télétravail.
- **Indeed, Welcome to the Jungle et JobTeaser** ne sont pas branchés : pas d'API publique de recherche d'offres, et pas d'aspiration des pages.

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

### Bouton « Postuler » et canal de candidature
- **Deux boutons distincts côté étudiant** (carte et détail de l'offre) :
  - « **Postuler** » (principal) n'enregistre rien : il emmène vers le canal de l'offre ;
  - « **J'ai postulé ✓** » (secondaire, contour ; ex-« Marquer comme posté ») enregistre la
    candidature (`POST /jobboard/applications/{id}/apply`, règles ci-dessus).
- **Canal de candidature**, dans cet ordre :
  1. lien (`externalLink`) → ouvert dans un nouvel onglet ;
  2. sinon adresse e-mail (`emailCandidature`) → `mailto:` avec l'objet
     « Candidature alternance – [intitulé] – [Prénom Nom] », « Candidature stage – … » selon le
     type de contrat (libellé contenant « alternance » ou « stage »), « Candidature – … » pour les
     autres. Une petite fenêtre reprend l'adresse et l'objet, avec un bouton « Copier » chacun, au cas
     où la messagerie ne s'ouvre pas ;
  3. sinon → le détail de l'offre.
- **Badge du canal** sur la carte : « 📧 Par mail » ou « 🔗 Lien externe » (rien sans canal).
- **Au retour sur la page** après « Postuler » (onglet du lien quitté, ou fenêtre e-mail fermée) :
  « Tu as envoyé ta candidature ? [Oui, marquer comme postée] [Pas encore] ». « Oui » équivaut à
  « J'ai postulé ✓ ». La question n'apparaît pas si la candidature est déjà enregistrée.
- **`email_candidature`** (V45) : première adresse e-mail trouvée dans la **description**, en
  minuscules (`ApplicationEmailExtractor`, motif `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`).
  Recalculée à chaque création ou modification par le staff, et à chaque import d'offre externe.
  Les offres existantes ont été rattrapées une fois par la migration V45, avec le même motif.
- **Offre déposée par le staff sans moyen de postuler refusée** : sans lien ni adresse e-mail dans
  la description, création et modification sont bloquées (formulaire, puis
  `400 job-offer-no-apply-channel` côté serveur). Le formulaire indique en direct le canal retenu.
- **Repère et filtre staff** « Sans moyen de postuler » : badge sur la ligne de l'offre, et
  `GET /jobboard/offers/all?noApplyChannel=true` (ni lien, vide compris, ni adresse) — utile pour
  les offres externes et les offres créées avant cette règle.

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

### Filtre « Déposée par » (page staff Offres)
- `GET /jobboard/offers/all` accepte un paramètre `postedBy` optionnel, filtré côté serveur
  (`JobOfferSpecification`), combinable avec tous les autres filtres et paginé :
  - l'identifiant d'un conseiller/admin → ses offres uniquement (`created_by_id`) ;
  - `EXTERNAL` → les offres externes uniquement (aucun auteur ITIC) ;
  - toute autre valeur → `400 job-offer-invalid-posted-by`.
- Les choix proposés viennent de `GET /jobboard/offers/authors` (réservé `ADVISOR`/`ADMIN`) : les
  conseillers/admins ayant déposé **au moins une offre**, actives ou non, triés par nom.
- Raccourci **« Mes offres »** : applique `postedBy` = l'utilisateur connecté (nouveau clic : retire
  le filtre).
- La liste staff affiche l'auteur de chaque offre (colonne « Déposée par ») ; pour une offre
  externe, « Externe · » suivi de sa source.
- Combinaisons contradictoires évitées par l'interface : choisir un auteur repasse la source sur
  « Toutes les offres » si elle était externe, et choisir « Offres externes » la repasse sur « Toutes »
  si elle était « internes » (et inversement quand on change la source).
- **Filtres dans l'URL** : recherche (`q`), lieu, type de contrat, secteur, source, statut (`active`,
  `all` pour « toutes ») et `postedBy` sont recopiés dans l'adresse de la page ; un lien copié rouvre
  la même vue filtrée. Seules les valeurs différentes des défauts (« Toutes les offres », « Actives »)
  y figurent.

---

### Brouillons d'offres et promotions ciblées (V54)
- **Brouillon** (`job_offers.draft`) : dans la fenêtre d'offre, l'équipe choisit « Enregistrer comme brouillon » ou « Publier ». Un brouillon n'exige **ni lien ni adresse de candidature** (vérifiés seulement à la publication : 400 `job-offer-no-apply-channel`), n'est **jamais montré aux étudiants** (liste, fiche : 404, candidature refusée) et n'apparaît que dans la liste de l'équipe, avec le badge « Brouillon » et le filtre « Brouillons » (`draft=true` sur `GET /jobboard/offers`).
- `POST /jobboard/offers/{id}/publish` publie un brouillon (date de publication `staff_published_at`, journal d'audit). Une offre déjà publiée ne redevient pas brouillon. Les offres existantes ont reçu `staff_published_at = created_at`.
- **Promotions ciblées** (`job_offer_target_promotions`) : choix multiple de promotions sur une offre de l'équipe. **Jamais affiché aux étudiants** (absent de la réponse côté étudiant). Sert à l'e-mail du soir (section 15).

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
- **Statuts par défaut** (CRUD complet par l'admin, contrairement aux statuts CRM) : **En attente** (0 XP), **Validé** (30 XP), **À corriger** (0 XP, code `A_CORRIGER`).
- **Code technique** (`cv_statuts.code`, V47, unique, liste fermée `CVStatutCode`) : identifie un statut que le code doit reconnaître quel que soit son nom. Il n'est ni exposé dans le formulaire admin ni modifié par l'API : renommer le statut garde son code, un statut créé par l'admin n'en a pas. Un statut qui porte un code **ne peut pas être supprimé** (409 `cv-statut-system-not-deletable`) : le recréer perdrait son code. Il reste renommable et désactivable. À la migration, `A_CORRIGER` est posé sur le statut dont le nom contient « corriger » (le premier actif par ordre s'il y en a plusieurs).
- **CV à examiner** (tuile « CVs à examiner » du tableau de bord, badge de la sidebar, `GET /dashboard/cv/pending-count`) : nombre de CV au statut **« En attente »**, c'est-à-dire le statut d'arrivée d'un CV déposé ou envoyé (premier statut actif par `ordre`, même règle que le remplacement). Un CV « Validé » ou « À corriger » n'est pas compté. Limité au portefeuille du conseiller, vue globale pour un admin.
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
- **CV des comptes désactivés** : la page « Validation des CVs » ne montre que les CV des comptes actifs (`users.active = true`). Le filtre est appliqué côté serveur sur la liste (`GET /cv`, avec ses filtres statut, conseiller et recherche), les puces par statut (`GET /cv/stats`), le badge « Validation CV » (`GET /dashboard/cv/pending-count`) et la tuile « CVs à examiner » (`cvsToReview` et `totalCvs`), en vue globale comme en portefeuille conseiller.
  - Rien n'est supprimé ni modifié : le CV garde son statut et réapparaît tel quel si le compte est réactivé.
  - Dans la vue « Comptes désactivés », chaque ligne propose « Réactiver le compte » (conseillers et admins, avec confirmation) ; une fois le compte réactivé, son CV quitte cette vue et revient dans la liste normale.
  - La puce grise « Comptes désactivés · N » (N = leurs CV, tous statuts confondus) affiche uniquement ces CV, avec le badge « Compte désactivé ». Côté API : `accountActive=false` sur `GET /cv` et `GET /cv/stats` ; sans ce paramètre, seuls les comptes actifs sont renvoyés. La réponse indique `student.accountActive`.
  - La fiche étudiant (`GET /cv/student/{id}`) affiche toujours le CV, compte actif ou non.
- **CV des étudiants sous contrat** : même logique que les comptes désactivés. Le CV d'un étudiant « sous contrat » n'a plus besoin d'être relu : il sort de la liste par défaut de « Validation des CVs », des puces par statut, du badge de la sidebar, de la tuile « CVs à examiner » (et de son sous-titre « N CVs déposés ») et du graphique des CV par statut du tableau de bord.
  - « Sous contrat », pour les CV = un contrat **déclaré ou vérifié** (statut `compteCommeContrat`, « Offre reçue »), date de fin vide ou pas encore passée (`StudentSpecification.contractDeclaredOrVerifiedPredicate`, `CVRepository.STUDENT_UNDER_CONTRACT`, réutilisés par `CVSpecification`). **Depuis le 16/11/2026, une déclaration pas encore vérifiée suffit** : un étudiant qui annonce son contrat sort aussitôt de « CV à corriger » et « CV validés » (demande de Jules) ; si la déclaration est refusée ou invalidée, le CV revient. Le tableau de bord garde sa règle « vérifiée » pour ses compteurs de contrats.
  - Rien n'est stocké ni modifié : la règle est recalculée à chaque requête. Le CV **revient de lui-même**, avec son statut, quand la date de fin est passée (fin du contrat, ou **rupture** saisie par un conseiller en avançant la date de fin via « dates du contrat »), ou quand la déclaration est **invalidée**. Un contrat qui se termine aujourd'hui compte encore jusqu'au soir.
  - La puce verte « Sous contrat · N » affiche uniquement ces CV, avec le badge « Sous contrat ». Le statut du CV y est **grisé et suivi de « en pause »** (ex. « À corriger · en pause ») : rien à faire tant que le contrat court. Côté API : `underContract=true` sur `GET /cv` et `GET /cv/stats`. Une seule puce active à la fois (un statut, « Comptes désactivés » ou « Sous contrat »). Un compte désactivé sous contrat n'apparaît que dans « Comptes désactivés ».
  - La fiche étudiant affiche toujours le CV.
- **Puces de « Validation des CVs » = la liste** : chaque puce (statuts, « Comptes désactivés », « Sous contrat ») est calculée avec la **même spécification que la liste** (`CVService.getCVStats` → `CVSpecification`), avec les mêmes filtres : conseiller, **recherche** et **étoiles** (`GET /cv/stats?search=…&starred=…`). Une puce annonce donc toujours le nombre de lignes que la liste affichera une fois choisie. Avant, les puces ignoraient la recherche et les étoiles.
- **Lien vers la fiche étudiant** (« Validation des CVs ») : dans la fenêtre d'un CV (icône œil), l'en-tête
  (photo, nom, e-mail) est un lien vers la fiche de l'étudiant, `/supervisor/etudiants/{id}` (page Étudiants,
  fiche ouverte).
  - Clic : même onglet ; Ctrl/Cmd+clic ou clic molette : nouvel onglet (vrai lien `<a>`). Au survol et au
    focus clavier, le nom se souligne et une flèche apparaît.
  - Fermer la fiche ramène à la validation des CV avec les mêmes filtres (statut, recherche, conseiller,
    étoiles, « Comptes désactivés », tri — recopiés dans l'URL de la page) et la même position dans la liste.
  - Réservé au staff : la fiche (`GET /dashboard/students/{id}/row`) est ouverte à tout conseiller ou admin,
    même non référent, compte désactivé compris ; pour un autre rôle, l'en-tête n'est pas cliquable.
- **Origine du CV actif** (`cvs.source`, V46) : `UPLOAD` (dépôt d'un PDF) ou `BUILDER` (généré par l'assistant, avec `cvs.template_code`). Les deux passent par **le même chemin de remplacement** (`CVService.replaceActiveCv`) : premier statut actif par `ordre`, même ligne `cvs`, fichier `cvs/{studentId}-{epochMillis}.pdf`, `xpAwarded = false`, ancien fichier supprimé seulement après la réussite du nouvel envoi. Audit `CV_UPLOADED` (dépôt) ou `CV_GENERATED` (assistant). Le conseiller voit un badge « Assistant · modèle » ; rien d'autre ne change pour lui.

### Assistant de création de CV (`/student/cv/assistant`, voir `docs/CV_BUILDER_SPEC.md`)
- **Brouillon** : une ligne `cv_drafts` par étudiant (sections en JSON, `@Version`). **Enregistrer le brouillon ne touche jamais la ligne `cvs`** : le statut et l'XP du CV actif ne bougent pas pendant la saisie. Auto-sauvegarde côté interface (1,5 s, au changement de section, en quittant la page) ; `PUT` avec une version périmée → **409**.
- **Prérempli au premier accès uniquement** (rien n'est enregistré tant que l'étudiant ne modifie pas) : prénom, nom, e-mail, téléphone du compte ; formation en cours « <promotion> — ITIC Paris » ; une expérience « à confirmer » par candidature au **contrat validé** (`contractVerified = true`).
- **Limites (400 + `MessageKey` dédiée)** : 15 expériences, 10 formations, 10 projets, 6 points par expérience, 200 caractères par point, accroche ≤ 400 caractères, liens en `http(s)` uniquement, dates `AAAA-MM`, niveaux de langue `A1`…`C2` / `NATIF`, modèle `LINEAIRE` / `CLASSIQUE` / `MODERNE` / `BANDEAU`, couleur d'accent dans la liste fermée (acceptée pour compatibilité, sans effet sur le rendu), langue du CV `fr` / `en`. Les champs vides sont acceptés (brouillon en cours).
- **Envoi au conseiller** (`POST /cv/builder/me/submit`) : enregistre le brouillon, génère le PDF (signature `%PDF-` et taille ≤ `MAX_CV_SIZE_MB` contrôlées), puis remplace le CV actif par le chemin commun ci-dessus. La confirmation affiche le même avertissement que le remplacement d'un fichier.
- **Anti-farm d'XP** : un envoi est **refusé** (`cv-builder-nothing-changed`) si le CV actif vient déjà de l'assistant et que l'empreinte SHA-256 (contenu + modèle + couleur + langue) est identique au dernier envoi. Changer une ligne, le modèle, la couleur ou la langue suffit pour renvoyer. Après un dépôt manuel, renvoyer le même CV de l'assistant reste possible.
- **Complétude** (`GET /cv/builder/me/score`) : score sur 100 et conseils (accroche, niveaux de langue, réalisations…). Le nombre de pages vient d'un vrai rendu PDF : au-delà d'une page, -5 points et conseil « vise 1 page ». Indicatif uniquement, jamais bloquant.
- **« Mon CV » sans CV** (13/11/2026) : `GET /cv/me` répond **204 sans corps** (et non plus 404) et `GET /cv/me/comments` une liste vide. Le 404 faisait boucler les anciennes versions du front encore servies par le service worker ; un corps vide est lu comme « pas de CV » par toutes les versions. Le front vérifie aussi les mises à jour du service worker toutes les 15 minutes et au retour sur l'onglet.
- **Dépôt manuel conservé** : « Mon CV » propose deux onglets, « Créer avec un modèle ITIC » et « Déposer un fichier ». Depuis le 13/11/2026 (demande ITIC), **« Créer avec un modèle ITIC » s'ouvre toujours par défaut**, même si l'étudiant a déjà déposé un fichier ; « Déposer un fichier » reste à un clic, et un lien direct vers `/student/cv/depot` ouvre toujours le dépôt. « Modifier dans l'assistant » n'apparaît que pour un CV généré.
- **Photo du CV** (13/11/2026) :
  - par défaut, la **photo de profil** du compte (JPEG, PNG, ou **WebP converti en JPEG** côté serveur, mêmes contrôles qu'un envoi : vrai type, 5 Mo, dimensions, EXIF supprimé) ; la case « Afficher ma photo de profil » est **cochée par défaut** dès qu'une photo existe (premier accès et « Réinitialiser » ; un brouillon déjà enregistré garde l'état de sa case). L'étudiant peut la décocher ;
  - **format de chaque maquette** : photo **carrée** pour le Linéaire (exemple de Jules), **portrait 5:6** pour le Classique, le Moderne et le Bandeau ;
  - « **Changer la photo** » (section Identité, ou zone photo de l'aperçu) : photo **propre au CV**, qui ne remplace jamais la photo de profil. L'étudiant la recadre au format du modèle choisi ; on garde l'**original** (ré-encodé, sans EXIF) et la **zone choisie**, et chaque modèle en dérive son format au rendu, centré sur cette zone : **changer de modèle ne demande jamais de recadrer**. « **Revenir à ma photo de profil** » la supprime (« Retirer cette photo » s'il n'y a pas de photo de profil) ;
  - serveur (`POST /cv/builder/me/photo`, fichier + zone `x`, `y`, `width`, `height` en fractions) : **JPEG, PNG ou WebP** (WebP accepté depuis le 14/11/2026, converti en JPEG ; Chrome et Edge n'appliquant pas l'orientation EXIF d'un WebP, la fenêtre de recadrage redresse elle-même la photo, pour que la zone choisie corresponde à la photo enregistrée), reconnu par la signature du fichier (ni l'extension ni le type annoncé) ; **5 Mo maximum** ; dimensions vérifiées avant décodage ; **orientation EXIF appliquée** (photo de téléphone, JPEG ou bloc EXIF d'un WebP), original réduit à 2000 px de côté au plus ; **ré-encodage JPEG sans aucune métadonnée** (EXIF, position GPS, appareil supprimés) ; zone hors de l'image refusée (400 `cv-photo-invalid-crop`) ;
  - stockage : même service de fichiers que les avatars, dossier **privé** `cv-photos/{studentId}-{horodatage}.jpg` (table `cv_photos`, migrations V49 et V50 pour la zone) ; aucune URL publique : l'image passe par `GET /cv/builder/me/photo?template=…` (l'étudiant) et `GET /cv/student/{id}/builder/photo` (conseillers et admins), comme le CV. Les photos envoyées avant V50 (déjà recadrées en 5:6) servent d'original, zone = toute l'image ;
  - **logo ITIC toujours en haut**, comme sur les maquettes, avec ou sans photo : dans le coin supérieur droit pour le Classique et le Linéaire (la photo juste à sa gauche), au-dessus du nom pour le Moderne et le Bandeau (la photo à droite) ;
  - **l'emplacement de la photo est toujours réservé** dans les 4 modèles : sans photo (ou case décochée), il reste vide dans le PDF (aucune icône, aucun texte) et la mise en page ne bouge pas ; dans l'aperçu de l'éditeur seulement, il affiche « Ajouter une photo », cliquable ;
  - la photo est dans l'aperçu, le PDF téléchargé et le CV envoyé au conseiller, en français et en anglais ; changer seulement de photo permet un nouvel envoi (l'empreinte anti-abus inclut la photo affichée) ; « Réinitialiser » garde la photo choisie ;
  - RGPD : la photo du CV est supprimée (ligne et fichier) à l'anonymisation de l'étudiant.
- **Noms des modèles** (13/11/2026) : « Linéaire (optimisé ATS) », « Classique (optimisé ATS) », « Moderne (optimisé ATS) », « Bandeau (optimisé ATS) » ; en anglais « Timeline / Classic / Modern / Banner (ATS-friendly) », sur les cartes et dans le badge conseiller « Assistant · modèle ».
- **Réinitialiser** (`POST /cv/builder/me/reset?version=…`) : le contenu du brouillon est remplacé par le prérempli (compte, formation ITIC, contrats validés) ; le modèle et la langue sont gardés, l'ordre des sections redevient celui du modèle. Même contrôle de version que l'enregistrement (409 si un autre onglet a modifié le brouillon). Le CV déjà envoyé au conseiller n'est **pas** touché. Sans brouillon enregistré, rien n'est créé. Toujours précédé d'une confirmation côté interface.
- **Accompagnement de l'étudiant** (interface seulement, aucune donnée nouvelle côté serveur) : conseils et exemples par section, exemples d'accroche et de réalisations insérés à la demande (jamais imposés, confirmation avant de remplacer un texte), verbes d'action, prochaine étape la plus utile du score. La **vérification avant envoi n'est jamais bloquante** : l'étudiant peut toujours envoyer. L'accueil n'est montré qu'une fois par compte et par navigateur (`localStorage`).
- **Lecture conseiller / admin** : `GET /cv/student/{studentId}/builder`, lecture seule (404 sans brouillon).
- **RGPD** : le brouillon figure dans l'export (`cvDraft`) et est **supprimé** (pas anonymisé) lors de l'anonymisation d'un étudiant, avec son CV.
- **Lisibilité par les logiciels de tri des recruteurs (ATS)**, vérifiée pour **chaque modèle**, avec et sans photo, par `CvAtsExtractionTest` (texte extrait du PDF avec PDFBox, dans l'ordre du flux et dans l'ordre de position) :
  - vrai texte sélectionnable, polices embarquées avec table de correspondance Unicode (accents, €, apostrophes) ;
  - ordre de lecture = ordre affiché : nom, coordonnées, profil, puis les sections dans l'ordre choisi par l'étudiant ; chaque entrée reste groupée. **Aucun texte en `float`** dans les modèles (openhtmltopdf écrit les floats avant le reste : les dates sortaient avant le nom) ; titre et date d'une entrée partagent une ligne de tableau ;
  - dans une puce, le gras (`**…**`) et le texte normal sont chacun dans leur élément : sinon le gras sortait après la fin de la phrase dans le flux du PDF ;
  - titres de section standards (Profil, Expériences professionnelles, Formation, Projets, Compétences, Langues, Certifications, Centres d'intérêt) ;
  - coordonnées dans le corps du document : aucun texte dans les marges de page (pas d'en-tête ni de pied de page) ;
  - la photo est une image décorative (`alt` vide) : avec ou sans photo, le texte extrait est identique.
  - Modèle Moderne sur **une seule colonne** (l'ancienne colonne latérale faisait sortir contact, compétences et langues avant le profil).
  - Titres de section espacés de **0,6 pt au plus** : à 1,2 pt, l'extraction insérait des espaces entre les lettres (« C E R T I F I C A T I O N S ») et le titre n'était plus reconnu ;
  - virgules des listes (compétences, centres d'intérêt) écrites en vrai texte : générées en CSS, elles sortaient après les mots dans le flux du PDF.
- **CV en anglais** : aucun libellé fixe français dans le PDF (titres, dates, niveaux, ligne entreprise, pied ITIC). Les types de contrat courants saisis en français sont traduits au rendu (Alternance → Apprenticeship, Stage → Internship…) ; un type inconnu de la table reste tel quel. « Inconnu » n'apparaît jamais sur un CV. Vérifié pour les 4 modèles par `CvAtsExtractionTest`.
- **Quatre modèles** (13/11/2026) : **Linéaire** (frise : dates et ville à gauche, ligne de temps à points), **Classique**, **Moderne**, **Bandeau** (en-tête marine). Couleurs fixes de la plateforme (marine `#11305B`, bleu `#3B71FF`, orange `#E2762F`), police Roboto, logo ITIC sur chaque modèle, photo facultative partout (photo de profil ou photo propre au CV, emplacement toujours réservé). Plus de choix de couleur.
- **Ordre des sections** : chaque modèle a son ordre par défaut (formation d'abord pour Classique et Bandeau, expériences d'abord pour Linéaire et Moderne), appliqué tant que l'étudiant n'a pas réordonné ses sections. Dès qu'il les déplace, son ordre est gardé quel que soit le modèle (`ordrePersonnalise` dans le JSON du brouillon, sans migration). La migration V48 élargit la contrainte `cv_drafts.template_code` aux quatre codes.
- **Champs ajoutés pour le modèle linéaire** (facultatifs, stockés dans le JSON du brouillon, sans migration) : pour une expérience, chiffre d'affaires, effectif et secteur de l'entreprise, rendus sur une ligne en italique « CA 3 M€ – effectif 35 collaborateurs (secteur) » ; pour une formation, jusqu'à 4 puces ; dans les puces, `**texte**` met en gras (le texte reste échappé : aucun HTML n'est interprété). Limites : 150 caractères par champ, 200 par puce.

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
- Actions tracées : `LOGIN`, `LOGOUT`, `STUDENT_REGISTERED`, `STAFF_USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `USER_DEACTIVATED`, `USER_REACTIVATED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_VERIFIED`, `CV_UPLOADED`, `CV_GENERATED` (envoi depuis l'assistant de CV, voir §6), `CV_VALIDATED`, `CV_REJECTED`, `CV_DELETED`, `CV_STATUS_UPDATED`, `CV_COMMENTED`, `TUTO_CREATED`, `TUTO_UPDATED`, `TUTO_DELETED`, `PROMOTION_CREATED`, `PROMOTION_UPDATED`, `PROMOTION_DELETED`, `STUDENT_ASSIGNED_TO_PROMOTION`, `STUDENT_REMOVED_FROM_PROMOTION`, `APPLICATION_CONTRACT_VALIDATED`, `APPLICATION_CONTRACT_INVALIDATED`, `APPLICATION_CONTRACT_DECLARED_BY_ADVISOR`, `STUDENT_SELF_DELETED_GDPR`, `STUDENT_ANONYMIZED_BY_STAFF`, `ALUMNI_CONTACT_DELETED` (voir §13), `OTHER` (`APPLICATION_CONTRACT_VERIFIED`/`APPLICATION_CONTRACT_REJECTED` restent dans l'enum et la contrainte CHECK pour la lecture des lignes historiques antérieures au renommage valider/invalider, mais ne sont plus jamais écrites).
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
- **Pagination déterministe (toutes les routes paginées)** : le défilement infini fait une requête SQL par page (`LIMIT/OFFSET`) ; sans ordre total, des lignes à égalité (ou une liste sans tri) peuvent changer de place entre deux requêtes, et un élément apparaît alors sur deux pages ou en est absent. `StablePaginationConfig` remplace le résolveur `Pageable` de Spring Data par `StablePageableArgumentResolver`, qui **ajoute `id` comme dernier critère de tri de tout `Pageable` reçu d'une requête HTTP** (le tri demandé reste prioritaire ; `id` n'est pas répété s'il figure déjà). Ne concerne **pas** les `PageRequest` créés en interne par les services : certains reposent sur un tri défini dans la requête même (ex : `StudentSpecification.needingAttention`), qu'un tri ajouté d'office écraserait. Départages plus fins ajoutés route par route quand un ordre naturel existe (ex : offres → `effectiveDate` puis `id`, voir `StablePageable`).
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
| `conversation-new-message.html` | Messagerie : « Vous avez un nouveau message » (fr/en), à l'étudiant (message de l'équipe, y compris « Envoyer un message ») ou au référent (message de l'étudiant) ; lien direct, jamais le contenu. Remplace `student-reminder.html` (supprimé le 14/11/2026), qui contenait le texte du message |
| `contract-declaration-invalidated.html` | Un conseiller/admin invalide une déclaration "sous contrat" (`POST /dashboard/applications/{id}/invalidate-contract`) — seul évènement de la section §2 "Suivi sous contrat" à notifier l'étudiant ; la validation (`validate-contract`) n'envoie rien, la déclaration passe juste au vert dans son suivi. Bilingue (`lang` de l'étudiant, comme `advisor-assigned.html`). |

- **`FRONTEND_URL`** (par défaut : `http://localhost:5173`) : URL de base du frontend, utilisée pour les liens des e-mails, dont « Lire le message » de `conversation-new-message.html` (`{FRONTEND_URL}/student/messages`, `{FRONTEND_URL}/supervisor/conversations/{id}`). En production, doit pointer vers le domaine réel du frontend.
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

## 14. Messagerie conseiller ↔ étudiant (V51, 14/11/2026)

Spécification : `PROPOSITIONS-JULES.md`, section 1, avec les valeurs proposées retenues. Avant, « Envoyer un message » envoyait un simple e-mail, enregistré nulle part, auquel l'étudiant ne pouvait pas répondre.

- **Un fil unique par étudiant, partagé par toute l'équipe CRE** (conseillers et admins). Tout membre de l'équipe lit et écrit dans le fil de n'importe quel étudiant, et l'historique ne se perd pas quand le référent change. Tables `conversations`, `conversation_messages` et `conversation_reads` (migration V51).
- **L'étudiant écrit à tout moment**, pas seulement pour répondre, même s'il n'a pas de référent.
- Le fil est **créé au premier message** ; le lire ne crée rien (aucune écriture sur une lecture).
- **Message** : 4000 caractères au plus (400 `conversation-message-too-long`) ; vide refusé (400 `conversation-message-empty`) ; espaces de début et de fin retirés, fins de ligne unifiées.
- **Compte étudiant désactivé ou anonymisé** : l'équipe lit toujours l'historique, mais n'y écrit plus (409 `conversation-student-inactive`).
- **Non-lus, par personne** (« lu jusqu'au message n », jamais en arrière, jamais au-delà du dernier message) :
  - pour l'étudiant, les messages de l'équipe ;
  - pour un membre de l'équipe, les messages de l'étudiant. Un conseiller qui lit le fil ne le marque pas comme lu pour ses collègues.
- **Compteurs de l'équipe** (`GET /dashboard/conversations/unread-counts`), en nombre de fils non lus :
  - `badge` (menu) : mes étudiants **et les étudiants sans référent**, pour qu'un message d'un étudiant sans référent ne passe pas inaperçu ;
  - `mine` : filtre « Mes étudiants » ;
  - `all` : filtre « Tous ».
- **Liste des fils** (`GET /dashboard/conversations`) : du plus récent au plus ancien, 20 par page (50 au plus).
  - Filtres `scope=MINE|ALL` et `unread=true`.
  - Recherche `q` sur le prénom, le nom et l'e-mail de l'étudiant, sans tenir compte des accents ni des majuscules ; chaque mot doit apparaître.
  - Chaque ligne indique le référent, un aperçu du dernier message (140 caractères) et le nombre de messages de l'étudiant non lus.
- **Fil** (`GET /conversation/me` pour l'étudiant, `GET /dashboard/conversations/students/{id}` pour l'équipe) : les 50 derniers messages par défaut (`limit`, 500 au plus) et `hasMore`. L'équipe voit aussi jusqu'où l'étudiant a lu.
- **Écrire** : `POST /conversation/me/messages` (étudiant), `POST /dashboard/conversations/students/{id}/messages` (équipe). **Marquer comme lu** : `POST …/read` avec le dernier message affiché.
- **Droits** : `/conversation/me/**` réservé aux étudiants, `/dashboard/conversations/**` aux conseillers et admins.
- **RGPD** :
  - conservation illimitée tant que l'étudiant est actif ;
  - à l'anonymisation (automatique ou à la demande), le fil est supprimé : messages et lectures ;
  - les messages sont inclus dans l'export RGPD (`conversation` : date, côté, auteur, texte) ;
  - si un compte de l'équipe est supprimé, ses messages restent, signés « Ancien conseiller » (clé étrangère `ON DELETE SET NULL`). Même chose pour un compte anonymisé.
- **« Envoyer un message »** (`POST /dashboard/students/{id}/notify`, fiche étudiant, liste, tableau de bord) : le message est **écrit dans le fil** de l'étudiant (vide : relance par défaut, dans sa langue), qui est prévenu comme pour tout message ; 4000 caractères au plus (1000 jusqu'au 14/11/2026 : un message long échouait). L'ancien e-mail « Rappel de votre conseiller », qui contenait le texte, n'existe plus.
- **E-mails « Vous avez un nouveau message »** (migration V52) :
  - l'équipe écrit : l'**étudiant** est prévenu ; l'étudiant écrit : son **référent** est prévenu (sans référent, ou référent désactivé : personne ; le fil compte alors dans le badge de toute l'équipe) ;
  - contenu : qui a écrit et un **lien direct** (`/student/messages`, `/supervisor/conversations/{id}`), **jamais le texte du message** ; dans la langue du destinataire (fr/en) ;
  - **délai (PR #96, remplace la règle des 15 minutes)** : l'e-mail ne part que si un message est resté **non lu pendant 1 heure** (`APP_MESSAGING_EMAIL_DELAY_MINUTES`, 60 par défaut). Lu avant : **aucun e-mail**. Contrôle chaque minute (`app.messaging.notification-scheduler.enabled`) ;
  - **un seul rappel par série** de messages non lus, par fil et par destinataire : **pas de relance tant que le destinataire n'a pas lu**, même si d'autres messages arrivent. Un nouveau rappel n'est possible que pour des messages écrits **après sa dernière lecture**, 1 heure après le premier d'entre eux ;
  - seul un rappel réellement envoyé bloque une relance : une série traitée sans e-mail (sans référent, compte désactivé) ne bloque pas les messages suivants, et un référent nommé plus tard est prévenu normalement. Limite connue : si le référent change alors qu'un rappel non lu attend, le nouveau référent n'est prévenu qu'après avoir lu le fil une première fois ;
  - le fil est verrouillé pendant la décision : deux messages simultanés ne donnent qu'un e-mail ;
  - compte étudiant désactivé ou anonymisé : aucun e-mail.
- **Onglet « Conversations »** (conseillers et admins, `/supervisor/conversations`, 15/11/2026) :
  - entrée de menu « Conversations » avec le badge `badge` ; l'ancien menu « Messages » (réclamations) s'appelait ensuite **« Demandes d'aide »** ; **retiré au lot 10** (§24), la messagerie le remplace ;
  - liste triée par dernier message, filtres « Mes étudiants » (par défaut pour un conseiller), « Tous » (par défaut pour un admin) et « Non lus », avec leurs compteurs, et recherche ;
  - fil avec zone de réponse (Ctrl + Entrée), ligne « Nouveaux messages », « Lu » quand l'étudiant a lu, « Afficher les messages précédents » ; compte désactivé : lecture seule ;
  - accès depuis la fiche étudiant (bouton « Conversation ») ; sur mobile, la liste puis le fil (`/supervisor/conversations/{studentId}`) ;
  - rafraîchissement par interrogation, sans temps réel : compteurs et liste toutes les 60 secondes, fil ouvert toutes les 12 secondes, suspendu quand l'onglet est caché ; un seul « lu » par nouveau message, le fil n'est pas redemandé ensuite (aucune boucle de requêtes) ;
  - vouvoiement, comme le reste de l'espace conseiller.
- **Page « Messages » de l'étudiant** (`/student/messages`, 16/11/2026) :
  - entrée de menu « Messages » avec le nombre de messages de l'équipe non lus (interrogé toutes les 60 secondes) ;
  - le fil avec l'équipe CRE : lire, écrire à tout moment, répondre (Ctrl + Entrée) ; messages de l'équipe signés « Prénom Nom · équipe CRE » (« Ancien conseiller » pour un compte supprimé) ; le conseiller référent est indiqué (sinon « toute l'équipe CRE lit tes messages ») ;
  - fil redemandé toutes les 12 secondes, un seul « lu » par nouveau message ; aucun message : invitation à écrire, rien n'est créé ;
  - **tutoiement**, comme dans « Mon CV » (l'e-mail d'avis garde le vouvoiement de tous les e-mails de la plateforme) ;
  - le bouton d'aide flottant (« Demandes d'aide ») est masqué sur cette page : il recouvrait la zone de saisie sur mobile, et l'étudiant y parle déjà à l'équipe.

## 15. E-mail « offres ciblées du soir » (V54)
- Chaque soir à **18 h (heure de Paris)**, chaque étudiant **actif, sans contrat en cours** (déclaré ou vérifié, comme pour les CV) et membre d'une promotion ciblée reçoit **un seul e-mail** regroupant les offres ciblées **publiées dans la journée** (non brouillon, actives). Aucune offre ciblée ce jour-là : aucun e-mail.
- Mise en page des e-mails du CRE, vouvoiement ; chaque offre renvoie à sa fiche (`/student/offres?offre=<id>`, ouverte directement après connexion).
- **Pas de double envoi** : une ligne `scheduled_mailings` (type, jour, destinataire) est posée dans sa propre transaction **avant** l'envoi ; deux serveurs ou deux passages le même soir n'envoient qu'une fois.
- **Préférence** : « Offres ciblées du soir » dans le profil de l'étudiant (activée par défaut, `students.email_targeted_offers`) et lien « Ne plus recevoir ces e-mails » en bas de l'e-mail, utilisable **sans connexion** (`/email/desinscription?token=…`, jeton signé HMAC propre à l'étudiant et au type d'e-mail ; `POST /public/email-preferences/unsubscribe`). Lien modifié ou faux : 400 `unsubscribe-link-invalid`.
- Variables (facultatives) : `APP_MAILING_TARGETED_OFFERS_ENABLED` (défaut `true`), `APP_MAILING_TARGETED_OFFERS_CRON` (défaut `0 0 18 * * *`).
- **RGPD** : préférence incluse dans le profil ; à l'anonymisation, abonnement coupé et lignes `scheduled_mailings` supprimées.

## 16. Brouillons de formulaire dans le navigateur
- Les longs formulaires (article, quiz, offre, commentaire de CV, message, « Demande d'aide », envoi d'un message à un étudiant, candidature) **s'enregistrent tout seuls** dans le navigateur, 0,8 s après la dernière frappe (`localStorage`, clé `cre-draft:<utilisateur>:<formulaire>`, propre à chaque personne). Rien n'est envoyé au serveur.
- À la réouverture : « Reprendre votre brouillon du … ? » (« ton » côté étudiant) avec « Reprendre » ou « Ignorer ».
- **Fermer un formulaire modifié** demande confirmation (« Fermer sans envoyer ? ») ; fermer l'onglet affiche l'avertissement du navigateur. La « Demande d'aide » ne se ferme plus sur un clic à côté.
- Brouillon **effacé à l'envoi** et **à la déconnexion** (tous les brouillons de l'appareil). Un formulaire revenu à ses valeurs de départ n'a pas de brouillon.
- Une seule brique réutilisable : `useFormDraft`, `DraftRestoreBanner`, `useCloseGuard`, `clearAllFormDrafts`.

## 17. Espace entreprise (V55, remplace le Google Sites « Espace Entreprise - NOS CANDIDATS »)
> **Lot 10 : masqué par défaut** (`APP_COMPANY_SPACE_ENABLED=false`, §24). Tout ce qui suit vaut quand l'interrupteur est allumé.
- **Public, sans connexion, vouvoiement** : `/entreprise` (accueil), `/entreprise/candidats` (répertoire niveau → domaine → formation, avec le nombre de CV), `/entreprise/candidats/{slug}` (page d'une formation). Le **slug est celui des liens courts `itic.short.gy/{slug}`** : il suffit de faire pointer chaque lien court vers la nouvelle adresse.
- **Qui apparaît** (recalculé à chaque requête, `CompanySpaceRepositories.ELIGIBLE`) : compte actif, choix « Apparaître dans l'Espace entreprise » activé (`students.company_space_visible`, oui par défaut), CV au statut **Validé** (code `VALIDE`, posé par V55 sur le statut existant ; le nom reste modifiable), **aucun contrat déclaré ou vérifié en cours** (même règle que les listes de CV). Rien n'est copié : un CV supprimé ou remplacé, un contrat déclaré, un compte désactivé ou le choix de l'étudiant le retirent **immédiatement**, sans tâche de nuit.
- **CV affiché** : le CV actif de l'étudiant (assistant ou PDF déposé ; un seul par étudiant, le plus récent).
- **Carte** : prénom, nom, formation, promotion, rythme, disponibilité, « Voir le CV » (visionneuse et téléchargement), « Ce profil m'intéresse ». Jamais d'e-mail ni de téléphone. Rythme et disponibilité sont saisis **par formation** dans le back-office (le CRE n'a pas ces champs par étudiant).
- **Rattachement des promotions** (`company_space_programs`) : annuaire prérempli avec les 39 formations du Google Sites. Chaque formation regroupe les étudiants de ses promotions, filtrés par **année d'étude** (1A / M1 = 1, 2A / M2 = 2). Promotions choisies à la main, sinon **mots-clés** (`bts sio|bts informatique` : au moins une alternative dont tous les mots sont des mots du nom de la promotion, sans accents ni majuscules).
- **PDF par lien signé** : `GET /public/entreprise/cv/{jeton}`, jeton HMAC (étudiant, CV, formation, expiration) valable **15 minutes** ; l'étudiant doit être toujours affichable avec ce même CV (sinon 404) ; expiré : 410 `company-space-link-expired`. Réponse `Cache-Control: no-store`. La page se recharge d'elle-même avant l'expiration.
- **Demandes** (`company_space_requests`) : « Ce profil m'intéresse » (avec l'étudiant) ou « Contactez-nous » (sans). Entreprise, nom, e-mail, message obligatoires ; téléphone facultatif. Anti-abus : champ piège (`website`, demande ignorée sans erreur), **5 demandes par heure et par adresse IP**, 100 par heure au total (`APP_COMPANY_SPACE_REQUEST_RATE_LIMIT_PER_IP` / `_GLOBAL`, facultatives). Lecture publique limitée à 300 requêtes par quart d'heure et par IP.
- **Prévenir l'équipe** : badge « Espace entreprise » du menu (demandes nouvelles) et e-mail à l'adresse choisie dans le back-office (vide : badge seulement). Une demande se marque « traitée » (qui, quand) ou se remet en « nouvelle ».
- **Back-office** (`/supervisor/espace-entreprise`, conseillers et admins) : formations (promotions rattachées, nombre de CV, masquer / afficher, aperçu, « Copier le lien », rythme, disponibilité, mots-clés), demandes, statistiques. **Admin seulement** : ajouter ou retirer une formation, textes, adresse prévenue, accès par lien privé. Modifications au journal d'audit (action `OTHER`, cible `COMPANY_SPACE`).
- **Statistiques sans donnée sur les visiteurs** (`company_space_daily_stats`) : pages vues et CV ouverts par jour et par formation, rien d'autre (ni IP, ni navigateur, ni cookie). L'aperçu du back-office n'est pas compté.
- **Jamais indexé** : en-tête `X-Robots-Tag: noindex` sur toutes les réponses publiques, balise `robots` « noindex » sur les pages, `robots.txt` (`Disallow: /entreprise`).
- **Accès par lien privé** (admin, désactivé par défaut) : sans la clé (`?cle=…`), toute route publique répond 404 et la page affiche « Page indisponible ». Nouvelle clé : les anciens liens cessent de fonctionner.
- **RGPD** : choix de l'étudiant et demandes le concernant dans son export (entreprise, date, formation, statut ; pas les coordonnées de l'entreprise) ; à l'anonymisation, retiré de l'annuaire et demandes supprimées. Coordonnées des entreprises **supprimées un an après la demande** (chaque nuit à 3 h 30).

## 18. Carte des étudiants (V56)
- **Code postal** (`students.postal_code`, facultatif) : saisi par l'étudiant dans son profil (« Code postal », tutoiement) ou par l'équipe sur la fiche étudiant (journal d'audit, action `OTHER`). 5 chiffres d'un département français, espaces ignorés ; vide = effacé ; sinon 400 `postal-code-invalid`.
- **Département déduit** (`students.department`) : 2 premiers chiffres ; Corse 200xx–201xx = **2A**, 202xx–206xx = **2B** ; outre-mer = 3 chiffres (971 à 976). Codes hors département (Monaco 98, 975…) refusés.
- **Lot 10** : le code postal fait partie de l'**adresse postale** (§24). Le bloc « Code postal » du profil et son bandeau sont remplacés par le bloc « Adresse » et le bandeau « Complète ton adresse ». Une fois l'adresse saisie, ni l'étudiant ni l'équipe ne peuvent effacer le code postal (400 `address-cannot-be-cleared`) ; l'équipe peut toujours le corriger sur la fiche.
- **Carte de l'équipe** (`/supervisor/carte`, conseillers et admins) : étudiants **actifs** par département. Île-de-France en carte SVG (contours intégrés au code, aucune tuile ni clé externe ; source IGN Admin Express via france-geojson, Licence ouverte), autres départements en liste. Un clic ouvre la liste du département : nom, formation (annuaire de l'Espace entreprise), promotion, contrat oui / non. **Seul le département est affiché** : jamais le code postal complet sur la carte ni dans la liste.
- **Filtres** : formation (formations de l'Espace entreprise : promotions rattachées et année d'étude), promotion, avec / sans contrat (contrat déclaré ou vérifié en cours, même règle que les CV). Le résumé indique aussi le nombre d'étudiants sans code postal.
- API : `GET/PUT /me/postal-code` (étudiant), `PUT /dashboard/students/{id}/postal-code`, `GET /dashboard/students/map`, `GET /dashboard/students/map/departments/{code}` (équipe, 403 pour un étudiant).
- **RGPD** : code postal dans l'export (`userProfile.postalCode`), effacé avec le département à l'anonymisation.

## 19. Récapitulatif du lundi et rapprochement offres / formations (V57)
- **Formation d'un étudiant** = les formations de l'annuaire (Espace entreprise) dont les promotions rattachées contiennent sa promotion, à son année d'étude (`StudentFormationResolver`). Sans formation : pas de récapitulatif.
- **Codes ROME et mots-clés d'offres par formation** (`company_space_programs.rome_codes`, `offer_keywords`), préremplis une fois pour les 39 formations (17 familles : développement, systèmes et réseaux, cybersécurité, commerce international, vente en magasin, relation client, communication, marketing digital, RH, assistanat, comptabilité, finance, banque-assurance, immobilier, santé, business). Modifiables dans Espace entreprise → Formations ; codes ROME vérifiés (`A1234`, séparés par des virgules).
- **Score d'une offre** (`OfferMatchingService`, sans IA externe) : chaque mot-clé de la formation trouvé dans l'**intitulé** vaut 3 points, dans le **secteur** 2, dans la **description** 1 (mots entiers, sans accents ni majuscules, balises HTML ignorées, écriture inclusive « Chargé(e) » ramenée à « chargé »). Pertinente à partir de **2 points**.
- **Récapitulatif du lundi** : chaque **lundi à 8 h (Paris)**, chaque étudiant **actif, sans contrat** (déclaré ou vérifié en cours), **abonné**, reçoit **un e-mail** avec au plus **10 offres** publiées dans les **7 derniers jours** (toutes sources, hors brouillons et offres désactivées), les plus pertinentes d'abord puis les plus récentes, chacune avec son lien direct, et « Voir toutes les offres ». **Aucune offre pertinente : aucun e-mail.**
- **Pas de double envoi** : verrou `scheduled_mailings` (type `WEEKLY_DIGEST`, semaine ISO `2026-W47`, destinataire), posé avant l'envoi.
- **Préférences du profil** : « Offres ciblées du soir » et « Récapitulatif du lundi », activées par défaut (`students.email_weekly_digest`). Le lien « Ne plus recevoir ces emails » de chaque e-mail ne coupe **que cet envoi** (jeton signé propre au type d'e-mail), sans connexion.
- Variables (facultatives) : `APP_MAILING_WEEKLY_DIGEST_ENABLED` (défaut `true`), `APP_MAILING_WEEKLY_DIGEST_CRON` (défaut `0 0 8 * * MON`).
- **RGPD** : à l'anonymisation, abonnement coupé et lignes `scheduled_mailings` supprimées.

## 20. Matching : score explicable offres / étudiants (lot 6)
- **Sans IA externe** (`MatchingService`) : chaque point a sa raison, affichée à l'écran.
  - **Formation** : mots-clés de la formation dans l'offre (intitulé 3, secteur 2, description 1 ; 9 au plus). **Une offre n'est proposée que si ce critère atteint 2 points.**
  - **Contrat** : alternance +4, stage +2.
  - **Niveau** : l'offre demande le niveau de l'étudiant (BTS / Bac+2, Bachelor / Bac+3, Mastère / Bac+5) +3, un autre niveau −2.
  - **Lieu** : même département que l'étudiant (code postal du profil, lot 3) +3, sinon tous deux en Île-de-France +1 ; télétravail +1. Le lieu de l'offre est lu dans le format France Travail (« 75 - PARIS 11 »), un code postal ou « Paris ».
  - **CV validé** : mots-clés de l'offre présents dans le texte du CV (PDF, assistant ou dépôt) +1 chacun, 3 au plus. Le texte est lu à la volée et gardé en mémoire tant que le CV ne change pas ; jamais stocké ni renvoyé.
- **« Recommandées pour toi »** (page Offres de l'étudiant) : 10 offres au plus, publiées depuis 60 jours, non expirées, hors brouillons et hors offres déjà marquées « J'ai postulé ». Chaque carte affiche « Pourquoi : … » (tutoiement) ; un clic ouvre la fiche de l'offre. Sans formation rattachée : rien. `GET /jobboard/recommendations`.
- **« Candidats suggérés »** (liste des offres de l'équipe, bouton ✨) : 20 étudiants **actifs, sans contrat** au plus, de la formation de l'offre, avec score et raisons (vouvoiement). « Envoyer l'offre » ouvre « Envoyer un message » prérempli (titre, entreprise, lien direct), qui écrit dans la conversation de l'étudiant. `GET /jobboard/offers/{id}/suggested-candidates` (équipe).
- Le **récapitulatif du lundi** (§19) classe les offres de la semaine avec ce même score, par étudiant.

## 21. « Ma fiche formation » (V59, lot 7)
- Bouton **« Ma fiche formation »** à côté du classement, sur le tableau de bord étudiant. Il ouvre dans un nouvel onglet la page de la formation sur le site pédagogique (https://malekedine.github.io/itic-pedagogie/). La formation de l'étudiant vient de l'annuaire de l'Espace entreprise (promotion et année d'étude). `GET /me/formation`.
- **Bouton masqué** si la formation n'a pas de page.
- Adresses **préremplies une fois** (`company_space_programs.pedagogy_url`) d'après le parcours des pages d'index du site : école → niveaux → formations. 29 formations sur 39 ont une page, toutes vérifiées en HTTP 200 le 17/11/2026. Elles sont **modifiables** dans Espace entreprise → Formations (https uniquement ; vide = pas de bouton).

| Formations du CRE | Page (après https://malekedine.github.io/itic-pedagogie/) | HTTP le 17/11/2026 | Correspondance |
|---|---|---|---|
| BTS SIO 1A, 2A SISR, 2A SLAM | `techschool/bts/sio.html` | 200 | sûr |
| BTS CI 1A, 2A | `businessschool/bts/ci.html` | 200 | sûr |
| BTS MCO 1A, 2A | `businessschool/bts/mco.html` | 200 | sûr |
| BTS NDRC 1A, 2A | `businessschool/bts/ndrc.html` | 200 | sûr |
| BTS COM 1A, 2A | `businessschool/bts/communication.html` | 200 | sûr |
| BTS CG 1A, 2A | `businessschool/bts/cg.html` | 200 | sûr |
| Bachelor Cybersécurité / Cloud | `techschool/bachelor/ais.html` | 200 | sûr (AIS : réseaux, systèmes, cybersécurité) |
| Bachelor Développeur Full Stack | `techschool/bachelor/cda.html` | 200 | sûr (CDA : développement web et mobile) |
| Bachelor CMDE | `businessschool/bachelor/cmde.html` | 200 | sûr |
| Bachelor RH | `businessschool/bachelor/rh.html` | 200 | sûr |
| Mastère Cyber M1, M2 | `techschool/mastere/cyber.html` | 200 | sûr |
| Mastère Fullstack M1, M2 | `techschool/mastere/eisi.html` | 200 | **à confirmer** (EISI : Expert en informatique et SI) |
| Mastère MSC M1, M2 ; Mastère Communication M1, M2 | `businessschool/mastere/mcm.html` | 200 | **à confirmer** (MCM : Manager commercial et marketing) |
| Mastère MRH M1, M2 | `businessschool/mastere/mrh.html` | 200 | sûr |
| Mastère MSFO M1, M2 | `businessschool/mastere/mo.html` | 200 | sûr (Management stratégique et financier des organisations) |
| BTS TP RH, SAM/GPME 1A et 2A, B/A 1A et 2A, PI 1A et 2A, TP Santé ; Bachelor Business Développeur, FCG | aucune page sur le site | — | bouton masqué |

## 22. Alerte « nouvelle offre pour ta formation », cartes et vue par formation (V60, lot 8)

### Rattachement offre ↔ formation (`job_offer_programs`)
- **Formation** = une des 39 formations de l'annuaire de l'Espace entreprise (lot 2). Un étudiant appartient à une formation par sa promotion et son année d'étude (même règle que le récapitulatif du lundi et le matching).
- **Offre de l'équipe** : les formations sont choisies dans le formulaire (« Formations ciblées », multi-sélection, ou « Toutes les formations »). **Obligatoire pour publier** une offre de l'équipe ; un brouillon peut attendre. Contrôlé dans le formulaire ; l'API accepte encore une offre sans formation (aucune alerte), pour ne pas casser les intégrations existantes.
- **Offre importée** (France Travail, La Bonne Alternance, Adzuna, JSearch) : formations **déduites** à l'import. France Travail donne le code ROME de l'offre (stocké dans `job_offers.rome_code`) : il doit faire partie des codes ROME de la formation **et** les mots-clés de la formation doivent donner au moins 2 points (score du matching : intitulé 3, secteur 2, description 1). Les autres sources ne donnent pas de code ROME : les mots-clés seuls.
- Lien « choisi par l'équipe » (`manual`) ou « déduit à l'import ». Rattacher / détacher à la main depuis l'onglet Formations.

### Déclencheurs de l'alerte
- Publication d'une offre de l'équipe (création publiée, ou publication d'un brouillon) : étudiants de toutes ses formations.
- Offre importée : une seule fois, à son insertion. Une offre en double (même entreprise, intitulé et ville chez une autre source, lot 5) n'est jamais insérée, donc ne déclenche rien.
- Offre modifiée : **aucune nouvelle alerte**, sauf pour une formation **ajoutée** (seuls ses étudiants). Rattachement manuel (onglet Formations) : idem.
- Brouillon, offre désactivée : rien.

### Destinataires
- Étudiants **actifs** de la formation, **sans contrat** (déclaré ou vérifié, en cours, comme le lot 1), abonnés (`students.email_instant_offers`, activé par défaut), e-mail valide, et formation dont les alertes sont **activées** (`company_space_programs.alerts_enabled`, activé par défaut).
- Unicité (offre, étudiant) en base : un étudiant n'est jamais prévenu deux fois de la même offre.

### File d'envoi (`offer_alert_outbox`) et regroupement
- Chaque alerte est d'abord mise en file (`PENDING`), traitée **chaque minute** (`APP_MAILING_INSTANT_OFFERS_CRON`, défaut à la 15e seconde de chaque minute, heure de Paris).
- **Regroupement** : on attend que la plus ancienne alerte en attente d'un étudiant ait **10 minutes** (`APP_MAILING_INSTANT_OFFERS_WINDOW_MINUTES`) ; toutes ses alertes en attente partent alors dans **un seul e-mail** (« 3 nouvelles offres pour ta formation »). « Instantané » veut donc dire « dans les 10 minutes ».
- Au moment de l'envoi, on revérifie : étudiant encore actif, abonné et sans contrat, offre encore publiée et active ; sinon l'alerte est écartée (`SKIPPED`).
- **Plafond** : 5 e-mails d'alerte par étudiant et par jour (heure de Paris, `APP_MAILING_INSTANT_OFFERS_DAILY_CAP`). Au-delà, l'alerte est **reportée** (`DEFERRED`) à l'**e-mail du soir** (lot 1, 18 h) ; elle y figure, puis passe en `EVENING`. Une alerte reportée après l'envoi de 18 h part dans l'e-mail du soir suivant.
- Une offre déjà reçue en alerte instantanée **n'est jamais répétée** dans l'e-mail du soir.
- **Échec d'envoi** : nouvel essai après 1 min puis 5 min ; au 3e échec, `FAILED` (visible dans le journal).
- **Désactivé par défaut** : `APP_MAILING_INSTANT_OFFERS_ENABLED=false` ; tant qu'il est faux, rien n'est mis en file ni envoyé (l'aperçu des destinataires le signale).

### E-mail
- Objet : « Nouvelle offre pour ta formation — <intitulé> » (une offre) ou « <n> nouvelles offres pour ta formation ». Même charte que les autres e-mails d'offres, tutoiement, version texte.
- Pour chaque offre : intitulé, entreprise, ville, type de contrat, source (Offre ITIC, France Travail…), bouton « Voir l'offre ». La date de début n'existe pas dans le modèle d'offre : non affichée.
- Lien de désinscription en un clic (jeton signé, sujet `INSTANT_OFFERS`), qui ne coupe que ces alertes. Interrupteur « Alertes « nouvelle offre pour ta formation » » dans le profil.

### Back-office
- Écran des offres, onglet **Formations** : une ligne par formation (offres actives, nouvelles sur 7 jours, étudiants actifs, sous contrat, alertes activées, dernière alerte) ; clic → la liste des offres filtrée sur cette formation ; rattacher / détacher des offres ; **journal** des envois (offre, formation, destinataires, envoyés, en échec, regroupés, reportés au soir, en attente).
- Liste des offres : colonne **Formation(s)**, **tri** par formation (ordre de l'annuaire de la première formation rattachée ; sans formation en dernier) et **filtre** multi-formations, gardé dans l'adresse (`?formations=`), combinable avec les autres filtres.
- Bouton **« Destinataires de l'alerte »** sur une offre : nombre et liste des étudiants qui la recevront, sans rien envoyer.
- Listes des **étudiants** et des **candidatures** : même filtre multi-formations (côté serveur), colonne « Formation » et **tri par formation** (promotion puis année d'étude, d'où se déduit la formation ; index V60).
- Côté étudiant : « **Offres pour ma formation** » choisi par défaut (s'il a une formation), « Toutes les offres » à un clic.

### Cartes (équipe CRE et admin)
- `/supervisor/carte`, un onglet par carte : **Étudiants** (lot 3) et **Entreprises et offres** : offres en ligne et entreprises qui recrutent par département (déduit de la localisation de l'offre, même règle que le matching), filtres formations, type de contrat, source ; détail d'un département : entreprises et leurs offres. Aucune adresse exacte, carte SVG intégrée (aucune clé payante), utilisable à 390 px.
- Le Google Sites `cre-pe` ne contient aucune carte (vérifié au lot 3 et au lot 8) : les deux cartes retenues sont celles-ci.

### RGPD
- File d'alertes de l'étudiant supprimée à l'anonymisation (et abonnement coupé). Aucune nouvelle donnée personnelle hors de cette file (identifiant étudiant, offre, dates d'envoi).

### Liens courts et contact
- Les 39 liens `itic.short.gy/<slug>` ont été vérifiés le 16/11/2026 : voir [LIENS_COURTS.md](./LIENS_COURTS.md) (28 existent, 11 à créer, 3 slugs déduits confirmés).
- « Contactez-nous » (Espace entreprise) appelle le **01 43 73 20 40**, le numéro affiché ; le formulaire reste proposé (« Ou écrivez-nous »).

## 23. Suppression définitive d'un compte et réglages de mise en production (V61, lot 9)

### Suppression définitive (admin)
- `POST /auth/admin/users/{id}/delete-permanently` avec `{ "confirmEmail": … }`, **admin seulement**. Dans le back-office :
  - fiche étudiant → « Supprimer définitivement » ;
  - Conseillers / Administrateurs → 🗑.
- La désactivation et l'anonymisation RGPD restent disponibles. L'ancien bouton « Supprimer le compte » de la fiche étudiant s'appelle désormais **« Anonymiser (RGPD) »**.
- **Confirmation** : l'adresse e-mail du compte, retapée (majuscules et espaces ignorés), sinon 400 `account-delete-confirmation-mismatch`.
- **Garde-fous** :
  - jamais son propre compte (403) ;
  - jamais le **dernier admin actif** (403 `last-admin-protection`, sous verrou) ;
  - un admin désactivé peut être supprimé.
- **Étudiant** : droit à l'effacement. Sont supprimés :
  - le compte ;
  - le CV, son fichier et ses commentaires ;
  - le brouillon et la photo du CV ;
  - les candidatures et leur historique, les candidatures au jobboard ;
  - les lectures d'articles et les quiz, l'historique XP, les demandes d'aide ;
  - la messagerie, les notes de l'équipe, les alertes et e-mails d'offres, les demandes d'entreprises, les codes OTP ;
  - la photo de profil.

  Les fichiers sont effacés **après** la validation de la transaction.
- **Conseiller ou admin** : ce qu'il a créé reste, **sans auteur**, affiché « Compte supprimé » :
  - offres, articles, catégories ;
  - commentaires de CV (V61 rend leur auteur facultatif) ;
  - messages, notes ;
  - demandes d'entreprises traitées.

  Ses étudiants n'ont plus de référent.
- **Journal d'audit** :
  - entrée `USER_DELETED` : « Compte supprimé définitivement (RÔLE) », avec l'admin qui supprime et la date ;
  - dans les entrées existantes, le nom et l'adresse du compte supprimé sont remplacés par « Compte supprimé ».
- Il n'existe pas de compte « entreprise » : l'Espace entreprise est public, sans compte.

### Réglages par défaut au déploiement
- Interrupteurs lisibles depuis le `.env` (variables d'environnement ou fichier importé) :
  - `APP_MAILING_TARGETED_OFFERS_ENABLED` (vrai) ;
  - `APP_MAILING_WEEKLY_DIGEST_ENABLED` (**faux**) ;
  - `APP_MESSAGING_NOTIFICATION_SCHEDULER_ENABLED` (vrai) ;
  - `APP_MAILING_INSTANT_OFFERS_ENABLED` (faux) ;
  - `APP_COMPANY_SPACE_PRIVATE_BY_DEFAULT` (vrai : l'Espace entreprise est **créé fermé**, l'admin l'ouvre).
- L'interrupteur « Alertes nouvelle offre » du profil étudiant n'apparaît que si les alertes sont activées (`instantOffersAvailable`).
- **Rattachement initial** : au premier démarrage, après l'annuaire des formations, les offres publiées et actives sont rattachées à leurs formations (mots-clés, code ROME s'il est connu). C'est fait une seule fois, sans alerte, par paquets de 500 (14 s pour 3 223 offres en recette).
- Côté étudiant, si « Offres pour ma formation » est vide sans filtre, la page passe sur « Toutes les offres » avec une explication.
- « Formations ciblées » n'est exigé qu'à la **publication** (nouvelle offre ou brouillon). Une offre déjà publiée se réenregistre sans.
- Le front ne relance **jamais** une requête en erreur 4xx (réglage global). Il relance au plus 3 fois une erreur réseau ou 5xx.
- « Étudiants à relancer » : ex aequo départagés par nom puis identifiant (ordre stable).
- Procédure de déploiement, risques et retour arrière : [MISE_EN_PROD.md](./MISE_EN_PROD.md).

## 24. Lot 10 : adresse, fin des « Demandes d'aide », Espace entreprise masqué, types de contrat, plafond à 4 (V62 à V64)

### Adresse postale de l'étudiant (V62)
- **Pourquoi** : dossier administratif (conventions de stage, contrats d'alternance).
- **Colonnes** (`students`, toutes nullables : les inscrits existants n'en ont pas) : `address_line1` (n° et rue, 120 car.), `address_line2` (complément, 120 car.), `city` (80 car.). Le **code postal** est celui de V56 (`postal_code`, 5 car.) ; le département de la carte suit l'adresse.
- **Inscription** (`POST /auth/register`) : rue, code postal (`^\d{5}$`, espaces autour retirés) et ville **obligatoires**, nettoyés (trim) ; erreurs par champ en 400 `validation-failed` : `ADDRESS_LINE1_REQUIRED`, `ADDRESS_LINE1_TOO_LONG`, `ADDRESS_LINE2_TOO_LONG`, `POSTAL_CODE_REQUIRED`, `POSTAL_CODE_INVALID`, `CITY_REQUIRED`, `CITY_TOO_LONG`.
- **Profil** (`GET/PUT /me/address`, étudiant) : mêmes règles ; modifiable, **jamais effaçable**. Journal d'audit : « Adresse postale modifiée par l'étudiant », sans la valeur.
- **Comptes créés hors inscription** : l'équipe ne crée pas d'étudiant (`POST /auth/admin/users` refuse `STUDENT`), il n'y a pas d'import ; seuls les seeders de test créent des étudiants, sans adresse. Les étudiants sans adresse gardent un accès complet : bandeau « Complète ton adresse » sur le tableau de bord et le profil, qui disparaît dès l'enregistrement.
- **Qui la voit** : l'étudiant (`/me/address` seulement : jamais dans le profil `/auth/users/me`, que le front garde dans le navigateur, ni dans l'entité `Student` sérialisée) et l'équipe (fiche étudiant en lecture seule, « Adresse non renseignée » sinon ; liste et export CSV : colonnes Adresse, Complément, Code postal, Ville ; une cellule qui commence par = + - @ est neutralisée par une apostrophe, contre les formules Excel). Le contrôle d'accès existant ne distingue pas le conseiller référent des autres conseillers sur la fiche : logique gardée.
- **Qui ne la voit jamais** : les autres étudiants, l'Espace entreprise et ses pages publiques (aucun DTO de `CompanySpaceService` ne porte l'adresse, test à l'appui), les CV générés (l'assistant ne lit pas l'adresse), les e-mails (aucun e-mail n'est envoyé aux entreprises ; la demande d'une entreprise part vers l'équipe sans adresse).
- **Aide au code postal** : à 5 chiffres, le navigateur interroge `https://geo.api.gouv.fr/communes?codePostal=…&fields=nom` (API publique de l'État, sans clé). Une ville : préremplie, modifiable ; plusieurs : liste de choix avec « Autre ville… » (saisie libre) ; ville proposée pour un ancien code postal : effacée ; pas de réponse : saisie libre, sans message d'erreur. Le dépôt ne pose aucune CSP ; si le Nginx du serveur en pose une, `connect-src` doit autoriser ce domaine (`verif_admins.sh` l'affiche).
- **RGPD** : dans l'export (`userProfile.addressLine1/addressLine2/postalCode/city`) ; effacée à l'anonymisation et avec la ligne `students` à la suppression définitive.

### « Demandes d'aide » retirées
- La messagerie (§14) remplace les demandes d'aide (réclamations). `POST /reclamations` répond **410 Gone** (`reclamations-retired`) ; les données restent en base (table `reclamations`, historique, liste de l'équipe `GET /dashboard/reclamations`).
- Plus aucun e-mail : écouteurs, événements et modèles supprimés. Aucune tâche planifiée n'existait.
- Front : entrée de menu et compteur retirés (plus de requête de comptage), bouton flottant « Contacter l'équipe » retiré côté étudiant ; `/supervisor/reclamations` → `/supervisor/conversations`, `/student/reclamations` → `/student/messages`.
- **Reprise dans la messagerie (V64, migration Java `db.migration.V64__reclamations_vers_messagerie`)**. Chaque demande **en attente** devient un message dans le fil de l'étudiant :
  - **contenu** : envoyé par l'étudiant, daté de la demande, texte « Ancienne demande d'aide du JJ/MM/AAAA : » suivi du message d'origine ;
  - **demande** : passe au statut `TRANSFERRED`, avec `transferred_at` et `transferred_message_id` ;
  - **ce qui ne bouge pas** : rien n'est supprimé ; les demandes résolues ou refusées restent telles quelles ; une demande transférée ne se rouvre ni ne se clôt (410) ;
  - **rejouée** : ne fait rien (seules les demandes `PENDING` jamais transférées sont reprises).
  - **Fil** : un seul par étudiant, partagé par toute l'équipe, sans lien avec un conseiller particulier. Un étudiant sans fil en reçoit un. Un étudiant **sans référent** apparaît dans « Mes étudiants » de tous les conseillers et chez les admins (portée « référent ou sans référent »). Aucun admin n'est rattaché d'office : ce serait lui assigner l'étudiant.
  - **Non lu, sans e-mail** : le fil apparaît « non lu » pour l'équipe (badge de Conversations), mais la reprise marque le message comme déjà signalé (`staff_notified_message_id`). Elle ne déclenche donc **aucun rappel « message non lu »**, ni au déploiement ni plus tard. Si un vrai message de l'étudiant attendait déjà son rappel, ce rappel unique part comme prévu ; la reprise n'en ajoute pas.
  - **Ordre** : les messages sont triés par identifiant, donc le message repris apparaît en fin de fil, avec sa date d'origine.
  - **Contrainte** : sur une base créée un jour par Hibernate, `reclamations_status_check` limitait les statuts à trois. V64 la remplace par la même contrainte avec `TRANSFERRED`. La prod n'avait pas cette contrainte ; elle l'a désormais, avec les quatre statuts.
- `scripts/prod/verif_admins.sh` affiche les demandes par statut et celles encore en attente : après V64, 0 en attente.

### Espace entreprise masqué (interrupteur)
- `app.company-space.enabled=${APP_COMPANY_SPACE_ENABLED:false}`, exposé au front par `GET /public/config` (sans connexion, lecture seule : `{ companySpaceEnabled }`).
- **Coupé** : aucune entrée de menu ni compteur, pour tous les rôles ; `/public/entreprise/**` (annuaire, formation, CV, demande) en **404**, page « Page non disponible » ; back-office `/supervisor/espace-entreprise` **réservé aux admins** par son adresse directe, avec le bandeau « Espace entreprise masqué : cette page n'apparaît dans aucun menu. » ; **403** `company-space-hidden` pour un conseiller (formations à modifier, aperçu, demandes, statistiques, réglages) ; le choix « Apparaître dans l'Espace entreprise » est masqué dans le profil étudiant.
- **Toujours actif** : `GET /company-space/programs` reste lisible par l'équipe (filtres par formation, carte, sélecteur des offres), et la configuration des formations sert en coulisses (rattachement des étudiants et des offres, alertes du lot 8, vue par formation, récapitulatif du lundi, codes ROME des sources, « Ma fiche formation »). La suite des alertes est rejouée avec l'espace masqué.
- **Allumé** : comportement d'avant le lot 10.
- **Fiche formation** : « Domaine » en liste déroulante (valeurs distinctes déjà utilisées, plus « Autre… » et un champ libre).

### Types de contrat (V63)
- « Publier une offre », les filtres de l'équipe et des étudiants lisent `GET /jobboard/contract-types/active/list` : la liste contient **CDI, CDD, Alternance, Stage, Job étudiant** (et « Inconnu » s'il est actif).
- V63 n'ajoute que les absents, sans casse, et reconnaît les variantes « Job Etudiant », « Job étudiant », « Job Étudiant » (et au pluriel) écrites en toutes lettres.
- **Base de prod en SQL_ASCII** : `lower()`, `translate()` et les comparaisons y travaillent octet par octet, et un caractère accentué fait deux octets. Une migration ne doit donc jamais comparer un texte accentué après transformation : égalité exacte sur des variantes écrites en toutes lettres, et vérification du libellé exact avant chaque `INSERT` (comme la contrainte unique). C'est ce qui a fait échouer la première V63 le 19/11 (voir `docs/MISE_EN_PROD.md` §9.5).
- Un « Job étudiant » déjà créé sous une autre orthographe (en prod : « Job Etudiant ») garde son identifiant et ses offres ; seul son libellé est corrigé. CDI, CDD, Stage, Alternance et Inconnu (synchronisation) ne sont jamais renommés ni supprimés.

### Plafond d'administrateurs à 4
- Défaut du code 4 (`ADMIN_MAX_ACTIVE`). La valeur du `.env` du serveur fait foi ; elle est réécrite à chaque déploiement depuis le secret `BACKEND_ENV_CONTENT`.

## Notes de fiabilité de ce document

- Ce document a été construit en lisant le code source directement (pas le cahier des charges initial, qui contient des écarts connus — ex: grades "Bronze→Platine" jamais implémentés, statuts CRM légèrement différents de la première spec).
- Toute règle ci-dessus peut devenir obsolète si le code évolue sans que ce fichier soit mis à jour en parallèle — en cas de doute, le code reste la source de vérité.
