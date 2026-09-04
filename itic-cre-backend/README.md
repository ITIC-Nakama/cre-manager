# ITIC CRE — Backend API

Plateforme de suivi des candidatures pour les étudiants ITIC Paris.  
Spring Boot 3.4.5 · Java 21 · PostgreSQL · JWT · Gamification · CV Management

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Spring Boot 3.4.5 |
| Langage | Java 21 |
| Base de données | PostgreSQL |
| ORM | Hibernate 6 / Spring Data JPA |
| Authentification | JWT (access + refresh token) + OTP email |
| Stockage fichiers | Cloudflare R2 (ou local) via `ICloudStorage` |
| Emails | JavaMailSender + Thymeleaf HTML templates |
| Documentation API | SpringDoc OpenAPI / Swagger UI |
| Build | Maven |

---

## Lancer le projet

```bash
# Copier et compléter les variables d'environnement
cp .env.example .env

# Avec Docker (recommandé)
docker compose up --build

# Ou en local sans Docker
./mvnw spring-boot:run
```

Swagger UI disponible sur : `http://localhost:8080/api/v1/swagger-ui.html`

---

## Variables d'environnement clés

Liste non exhaustive (voir `.env.example` pour la liste complète) :

| Variable | Défaut | Rôle |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Origines autorisées par le CORS backend |
| `FRONTEND_URL` | `http://localhost:5173` | URL de base du frontend : sert à construire les liens cliquables dans les emails (ex: bouton "Accéder à mon espace" du rappel conseiller) |
| `APP_BRAND_NAME` | `ITIC CRE` | Nom affiché dans l'en-tête/pied des emails |
| `SWAGGER_ENABLED` | `true` | Active/désactive Swagger UI et `/v3/api-docs`. **À mettre à `false` en production** — ces routes sont publiques (`permitAll`) et exposent toute la surface de l'API sans authentification. |

---

## Structure des modules

```
platform/
├── auth/          # Inscription, login, JWT, rôles, profils, promotions, affectation conseiller
├── crm/           # Candidatures étudiant (liste + détail, pas de Kanban)
├── cv/            # Upload CV PDF, statuts, commentaires conseiller
├── dashboard/     # Statistiques agrégées pour les conseillers/admins
├── gamification/  # XP, grades, historique
├── gdpr/          # Anonymisation, purge planifiée, export de données
├── jobboard/      # Offres d'emploi, secteurs, candidatures Jobboard → CRM auto-link
├── skill/         # Skill tree, articles, quiz
├── audit/         # Journal des actions
├── seeder/        # Données de démarrage (rôles, statuts, config par défaut)
└── shared/        # Config, exceptions, i18n, stockage, notifications
```

---

## Groupes Swagger

| Groupe | Périmètre |
|--------|-----------|
| 0. Toutes les APIs | Vue complète |
| 1. Authentification | Login, register, OTP, refresh token |
| 2. Gestion Utilisateurs & Profils | Utilisateurs, rôles, promotions |
| 3. Journal d'Audit | Logs d'actions admin |
| 4. Job Board | Offres et candidatures jobboard |
| 5. CRM — Applications | Pipeline de candidatures |
| 6. Gamification — Étudiant | XP, grades, historique |
| 7. Administration | Config, gestion admin |
| 8. Skill Tree | Arbre de compétences |
| 9. CV Management | Upload CV, statuts, commentaires (conseillers) |
| 10. Dashboard Advisor | Stats agrégées promotions / étudiants |
| 11. Espace Étudiant | Vue CRM + gamification côté étudiant |

---

## Système de notifications email

### Principe — Event-driven post-commit

Les emails de notification (changement de statut CV, nouveau commentaire) sont envoyés via un mécanisme en deux étapes qui garantit :

1. **L'email n'est jamais envoyé si la transaction échoue** (rollback → pas d'email parasite)
2. **L'envoi n'est pas bloquant** (le conseiller n'attend pas le serveur SMTP)
3. **Aucune association JPA lazy n'est accédée hors transaction** (pas de `LazyInitializationException`)

### Comment ça marche

```
CVService.updateStatus()          CVService.addComment()
  [dans une @Transactional]         [dans une @Transactional]
        │                                   │
        │  1. Sauvegarde en base            │
        │  2. Extrait les strings           │
        │     (email, prénom, statut)       │
        │  3. publishEvent(...)             │
        │                                   │
        └──────────────┬────────────────────┘
                       │
              ApplicationEventPublisher
                       │
           Spring attend le COMMIT de la transaction
                       │
                       ▼
          @TransactionalEventListener(AFTER_COMMIT)
          + @Async → thread séparé
                       │
                       ▼
          NotificationEmailService.onCVStatusChanged()
          NotificationEmailService.onCVCommentAdded()
                       │
                       ▼
              JavaMailSender → SMTP → étudiant
```

### Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `shared/notification/event/CVStatusChangedEvent.java` | Record portant email + prénom + statutNom + couleur |
| `shared/notification/event/CVCommentAddedEvent.java` | Record portant email + prénom + contenu du commentaire |
| `cv/service/CVService.java` | Publie l'événement **dans** la transaction (strings extraits de la session JPA ouverte) |
| `shared/notification/NotificationEmailService.java` | Écoute l'événement **après commit**, envoie l'email en mode `@Async` |
| `resources/templates/email/cv-notification.html` | Template Thymeleaf HTML partagé (type STATUS ou COMMENT) |

Le rappel libre envoyé par un conseiller (`POST /dashboard/students/{id}/notify`) suit le même principe et utilise `resources/templates/email/student-reminder.html`. Son bouton "Accéder à mon espace" pointe vers `${FRONTEND_URL}/student/dashboard` — voir [Variables d'environnement](#variables-denvironnement-clés).

---

## Email OTP — Création de compte et renvoi

Même mécanisme event-driven que pour les notifications CV.

```
registerStudent()  [@Transactional]
  ├─ userRepository.save(student)
  └─ otpService.sendEmailVerificationOtp()  [rejoint la même transaction]
       ├─ otpRepository.save(otp)
       └─ eventPublisher.publishEvent(OtpEmailEvent)
            ↓ Spring attend le COMMIT de la transaction parente
  [COMMIT — user + otp en base ensemble]
            ↓
  @TransactionalEventListener(AFTER_COMMIT) + @Async
  NotificationEmailService.onOtpRequested()
       └─ mailSender.send(...)  ← thread séparé, non-bloquant
```

### Garanties

- **User et OTP commitent ensemble** : `registerStudent` est `@Transactional`, `otpService.sendEmailVerificationOtp` rejoint cette transaction (propagation REQUIRED). Un rollback annule les deux, pas l'un sans l'autre.
- **Pas d'email si rollback** : l'événement ne se déclenche qu'après le commit.
- **L'inscription ne peut jamais échouer à cause du SMTP** : si le serveur mail est indisponible, l'étudiant est inscrit, l'erreur est loguée, il peut demander un renvoi OTP.
- **Non-bloquant** : la réponse HTTP est renvoyée immédiatement, l'email part en arrière-plan.

### Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `shared/notification/event/OtpEmailEvent.java` | Record : email, prénom, lang, code OTP, durée d'expiration |
| `auth/service/OtpService.java` | Génère le code, sauvegarde l'OTP, publie `OtpEmailEvent` |
| `auth/service/AuthService.registerStudent()` | `@Transactional` : englobe user + OTP dans une seule transaction |
| `shared/notification/NotificationEmailService.java` | Écoute `OtpEmailEvent` via `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` |

---

## Jobboard → CRM auto-link

Quand un étudiant postule à une offre via le Jobboard (`POST /jobboard/applications/{jobOfferId}/apply`) — offre ITIC (`MANUAL`) ou externe (France Travail/Adzuna/La Bonne Alternance), même traitement pour les deux — une entrée CRM est automatiquement créée au statut "Postulé", avec un **instantané complet de l'offre** copié (entreprise, poste, type de contrat, lien, description, localisation, logo) : la candidature reste affichable et exploitable même si l'offre source est ensuite modifiée, expire ou est supprimée.

L'XP n'est créditée que si l'étudiant n'a pas déjà atteint le seuil hebdomadaire anti-farming configurable (`APPLICATION_XP_WEEKLY_LIMIT`, source-agnostique) — au-delà, la candidature est quand même créée normalement, juste sans XP supplémentaire.

Les deux opérations (JobApplication + Application CRM) sont englobées dans une seule `@Transactional` sur `JobApplicationService.apply()` : si l'une échoue, les deux sont annulées.

Détail complet du fonctionnement de l'agrégation externe (synchronisation, critères configurables, expiration, nettoyage automatique) : [docs/REGLES_METIER.md §3](../docs/REGLES_METIER.md#3-jobboard--offres-demploi).

---

## Suivi "sous contrat"

Le statut "sous contrat" d'un étudiant repose sur une **déclaration purement étudiante** : n'importe quel étudiant peut faire passer sa candidature au statut "Offre reçue" (`ApplicationStatus.compteCommeContrat = true`) sans preuve. `Application.contractVerified` distingue une déclaration en attente d'une déclaration confirmée par un conseiller/admin — remis à `false` à chaque nouvelle déclaration.

Trois endpoints dédiés dans `DashboardController` (`ADVISOR`/`ADMIN`, **ouverts à n'importe quel conseiller/admin**, pas seulement celui affecté à l'étudiant) :
- `PATCH /dashboard/applications/{id}/contract-dates` — modifie les dates, vaut confirmation implicite.
- `POST /dashboard/applications/{id}/verify-contract` — confirme la déclaration.
- `POST /dashboard/applications/{id}/reject-contract` — l'annule, revient au statut précédent et révoque l'XP gagné entre-temps ; journalisé (`APPLICATION_CONTRACT_VERIFIED`/`APPLICATION_CONTRACT_REJECTED`).

Le filtre `underContract` (`GET /dashboard/students`, `.../students/all`, `.../applications/grouped-by-student`) et le compteur `studentsNeedingContractVerificationCount` (`GET /dashboard/overview`) suivent des règles de date distinctes — voir [docs/REGLES_METIER.md §2](../docs/REGLES_METIER.md#suivi-sous-contrat-déclaration-étudiante--vérification-conseiller) pour le détail complet.

---

## Gamification

| Action | XP (configurable) |
|--------|-------------------|
| Candidature créée | `GamificationConfig` (action `CANDIDATURE_CREATED`) |
| Quiz validé (≥ score minimum) | `GamificationConfig` (action `QUIZ_COMPLETED`) |
| Changement de statut de candidature | défini sur chaque `ApplicationStatus.gainXP` |
| Changement de statut de CV (ex: validation) | défini sur chaque `CVStatut.gainXP` |

Un flag `xpAwarded` sur `CV` empêche le double comptage si un statut est basculé plusieurs fois ; il se réinitialise à chaque nouveau dépôt de CV par l'étudiant.

Les grades (seedés par défaut : Débutant, Intermédiaire, Avancé, Expert) sont calculés dynamiquement selon le total XP de l'étudiant, et entièrement gérés (CRUD) par l'admin/conseiller depuis la page Gamification, qui centralise aussi la configuration des points XP par action, par statut de candidature et par statut de CV.

---

## Promotions

Les promotions sont créées par un administrateur et sélectionnées par l'étudiant à l'inscription (`promotionId` dans `UserRegisterDto`). Elles servent de filtre dans le Dashboard Advisor (stats par promotion).

---

## Gouvernance Multi-Admin & RBAC (Sécurité & RGPD)

- **Plafond d'administrateurs actifs** : Configurable via `ADMIN_MAX_ACTIVE=2` (bloque la création ou réactivation d'un 3ème admin actif).
- **Protections d'intégrité & Auditability** :
  - Auto-désactivation interdite pour les comptes administrateurs (`CANNOT_SELF_DEACTIVATE`).
  - Protection du dernier administrateur actif (`LAST_ADMIN_PROTECTION` si `activeAdmins <= 1`).
  - Suppression physique des comptes administrateurs interdite (`ADMIN_CANNOT_BE_DELETED`).
  - Réinitialisation ou modification du mot de passe d'un administrateur par un tiers interdite (`ADMIN_PASSWORD_RESET_FORBIDDEN`).
- **Permissions de désactivation / réactivation** :
  - **Administrateurs (`ADMIN`)** : peuvent désactiver et réactiver le staff (conseillers, admins) et les étudiants.
  - **Conseillers (`ADVISOR`)** : peuvent désactiver et réactiver **uniquement** des comptes étudiants (`STUDENT`).
- **Conformité RGPD automatisée & Configuration Applicative BDD** : `GdprPurgeScheduler`, `GdprService` et `AppConfigurationService` assurent la gouvernance RGPD :
  - **Configuration dynamique en BDD (`app_configuration`)** : Les durées de rétention (`GDPR_OTP_RETENTION_HOURS`, `GDPR_AUDIT_LOG_RETENTION_DAYS`, `GDPR_INACTIVE_STUDENT_RETENTION_DAYS`, `STALE_ALERT_DAYS`, `PROMOTION_REMINDER_MONTHS`) sont gérées dynamiquement par les Administrateurs via `GET/PUT /api/admin/app-config` (protégé `@PreAuthorize("hasRole('ADMIN')")`).
  - **Purge quotidienne (03:00 AM)** : destruction automatique des OTP expirés, des journaux d'audit anciens et anonymisation des comptes étudiants inactifs depuis la durée légale configurée.
  - Anonymisation irréversible des étudiants (effacement nominatif, anonymisation email `@rgpd.deleted`, suppression du CV physique, détachement de la promotion `student.setPromotion(null)`).
  - **Exclusion des vues opérationnelles** : Les comptes anonymisés sont automatiquement exclus des requêtes de listing d'étudiants, des recherches et des compteurs de promotion.
  - **Réactivation et rappels strictement bloqués** : La réactivation (`PATCH /auth/users/{id}/reactivate`) et l'envoi de rappels (`POST /dashboard/students/{id}/notify`) sur des comptes anonymisés renvoient HTTP 403 `ANONYMIZED_USER_CANNOT_BE_REACTIVATED`.

