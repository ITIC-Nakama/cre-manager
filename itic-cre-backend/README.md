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
cp src/main/resources/application.properties.example src/main/resources/application-local.properties

# Lancer avec le profil local
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Swagger UI disponible sur : `http://localhost:8080/api/v1/swagger-ui.html`

---

## Structure des modules

```
platform/
├── auth/          # Inscription, login, JWT, rôles, profils, promotions
├── crm/           # Candidatures étudiant (pipeline Kanban)
├── cv/            # Upload CV PDF, statuts, commentaires conseiller
├── dashboard/     # Statistiques agrégées pour les conseillers
├── gamification/  # XP, grades, skill tree, historique
├── jobboard/      # Offres d'emploi, candidatures Jobboard → CRM auto-link
├── audit/         # Journal des actions
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

Quand un étudiant postule à une offre via le Jobboard (`POST /jobboard/offers/{id}/apply`), une entrée CRM est automatiquement créée au statut "Postulé" (ordre 2) avec les XP associés.

Les deux opérations (JobApplication + Application CRM) sont englobées dans une seule `@Transactional` sur `JobApplicationService.apply()` : si l'une échoue, les deux sont annulées.

---

## Gamification

| Action | XP (configurable) |
|--------|-------------------|
| Candidature créée | configuré via `AppConfiguration` |
| Changement de statut | défini sur chaque `ApplicationStatus.gainXP` |
| Skill tree | défini sur chaque `SkillNode` |

Les grades (Bronze → Platine) sont calculés dynamiquement selon le total XP de l'étudiant.

---

## Promotions

Les promotions sont créées par un administrateur et sélectionnées par l'étudiant à l'inscription (`promotionId` dans `UserRegisterDto`). Elles servent de filtre dans le Dashboard Advisor (stats par promotion).
