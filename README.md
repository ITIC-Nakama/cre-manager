# ITIC CRE

Plateforme de suivi des candidatures (stage/alternance) pour **ITIC CRE**.

## Structure du projet

*   **[itic-cre-backend](./itic-cre-backend)** : API Spring Boot pour le backend.
*   **[itic-cre-frontend](./itic-cre-frontend)** : Application React pour le frontend.

---

## Backend (`itic-cre-backend`)

## Stack

- Java **21** · Spring Boot **3.4.5** · PostgreSQL · JWT

## Rôles

| Rôle | Inscription | OTP email |
|------|-------------|-----------|
| **STUDENT** | `POST /auth/register` (public) | Oui |
| **ADVISOR** | `POST /auth/admin/users` (admin) | Non |
| **ADMIN** | `POST /auth/admin/users` (admin) | Non |

Chaque utilisateur a **un seul rôle** (`users.role_id` → `roles`).

Un **admin** peut créer d’autres admins et des conseillers.  
Ces comptes reçoivent un **mot de passe temporaire** : à la première connexion, l’utilisateur doit le changer via `POST /auth/change-password` avant d’accéder au reste de l’API (`mustChangePassword: true` dans la réponse login).

## Configuration (`.env`)

```bash
cp .env.example .env
```

Spring Boot charge automatiquement `.env` à la racine du projet. Le fichier `.env` est ignoré par Git.

## Démarrage avec Docker (recommandé)

```bash
docker compose up --build
```

- API : http://localhost:8080/api/v1  
- Swagger : http://localhost:8080/api/v1/swagger-ui.html  
- PostgreSQL : `localhost:5432` (user/pass : `postgres` / `postgres`)

Un admin bootstrap est créé si absent : `admin@itic.fr` / `Admin123!` (modifiable dans `docker-compose.yml`).

## Démarrage local (sans Docker)

1. Base PostgreSQL : `itic_cre`
2. Variables : `SECRET_KEY`, `REFRESH_SECRET_KEY`, `DB_*`
3. Premier admin (optionnel au 1er lancement) :

```properties
app.bootstrap.admin.enabled=true
app.bootstrap.admin.email=admin@itic.fr
app.bootstrap.admin.password=ChangeMe123!
```

4. Lancer :

```bash
./mvnw spring-boot:run
```

- API : http://localhost:8080/api/v1  
- Swagger : http://localhost:8080/api/v1/swagger-ui.html  

## Endpoints Auth

| Méthode | Endpoint | Accès |
|---------|----------|--------|
| POST | `/auth/register` | Public — étudiant + OTP |
| POST | `/auth/login` | Public |
| POST | `/auth/admin/users` | `ROLE_ADMIN` — admin ou conseiller |
| POST | `/auth/otp/*` | Public — **étudiants uniquement** |
| POST | `/auth/reset-password` | Public — **étudiants uniquement** |
| POST | `/auth/change-password` | Authentifié — changement du mot de passe temporaire |
| GET | `/auth/admin/audit-logs` | `ROLE_ADMIN` — journal qui a fait quoi |

### Inscription étudiant

```json
POST /api/v1/auth/register
{
  "email": "etudiant@itic.fr",
  "firstName": "Jean",
  "lastName": "Dupont",
  "password": "Motdepasse1!"
}
```

### Créer un conseiller (admin connecté)

```json
POST /api/v1/auth/admin/users
Authorization: Bearer <token_admin>
{
  "role": "ADVISOR",
  "email": "conseiller@itic.fr",
  "firstName": "Marie",
  "lastName": "Martin",
  "password": "Motdepasse1!",
  "jobTitle": "Conseillère pédagogique"
}
```

### Créer un autre admin

```json
{
  "role": "ADMIN",
  "email": "admin2@itic.fr",
  ...
}
```

Les emails sont stockés en clair (pas de hash/chiffrement).

### Première connexion (admin / conseiller créé par admin)

```json
POST /api/v1/auth/login
→ user.mustChangePassword: true

POST /api/v1/auth/change-password
Authorization: Bearer <token>  (ou cookie)
{
  "currentPassword": "mot-de-passe-temporaire",
  "newPassword": "MonNouveauMotDePasse1!"
}
→ nouveaux cookies JWT, mustChangePassword: false
```

---

## Frontend (`itic-cre-frontend`)

### Stack

- **Framework** : Vite + React + TypeScript
- **Style** : Tailwind CSS + Vanilla CSS pour les composants personnalisés
- **State Management** : Zustand (gestion de session, thème, etc.)
- **Routing** : React Router DOM
- **API Queries** : TanStack React Query + Axios
- **Internationalisation** : i18next

### Démarrage local

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement (si applicable) :
   ```bash
   cp .env.example .env
   ```

3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

   - Frontend accessible sur : `http://localhost:5173` (ou port affiché dans le terminal)

### Fonctionnalités implémentées

- **Auth Flow complet** : inscription étudiant avec validation OTP, connexion, changement de mot de passe obligatoire pour les comptes créés par un admin.
- **Espace étudiant** : dashboard, CRM kanban des candidatures, jobboard (recherche + candidature en un clic), skill tree (catégories/articles/quiz avec XP), upload et suivi du CV.
- **Espace conseiller/admin** : gestion des candidatures et étudiants, validation des CV avec commentaires, gestion du contenu (catégories/articles/quiz), gestion des offres d'emploi, page **Gamification** (configuration des points XP par action/statut de candidature/statut de CV, gestion des grades).
- **Composants partagés** : modale de confirmation générique (`ConfirmDialog`) utilisée pour toutes les suppressions, design responsive avec navigation (`DashboardNavBar`) et logo officiel ITIC Paris.

