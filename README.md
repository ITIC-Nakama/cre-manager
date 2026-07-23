# ITIC CRE

Plateforme complète de suivi des candidatures (stage & alternance), de gestion des CVs, d'offres d'emploi, de gamification et d'accompagnement pour **ITIC CRE**.

---

## 📚 Documentation & Références

Toute la documentation détaillée du projet est centralisée dans le dossier [`docs/`](./docs) :

*   📋 **[Règles Métier (`docs/REGLES_METIER.md`)](./docs/REGLES_METIER.md)** : Spécifications et règles métier réellement implémentées dans le code (Authentification, CRM, Gamification, CV, RGPD, Skill Tree, Audit, Limites d'upload).
*   🧪 **[Couverture & Architecture des Tests (`docs/TEST_COVERAGE.md`)](./docs/TEST_COVERAGE.md)** : Architecture de test automatisée, matrice de couverture intégrale (31 tests d'intégration sur 10 modules), exécution CI/CD dans GitHub Actions.

---

## 📂 Structure du projet

*   **[itic-cre-backend](./itic-cre-backend)** : API Spring Boot 3.4.5 / Java 21 (PostgreSQL, Spring Security, JWT, JPA, Liquibase/Seeders).
*   **[itic-cre-frontend](./itic-cre-frontend)** : Application Single Page React + Vite + TypeScript + Tailwind CSS (TanStack Query, Zustand, i18next).
*   **[docs](./docs)** : Documentation technique et métier de référence.

---

## 🚀 Démarrage rapide avec Docker (Recommandé)

```bash
cp .env.example .env
docker compose up --build
```

- **API Backend** : `http://localhost:8080/api/v1`
- **Swagger UI (Documentation OpenAPI)** : `http://localhost:8080/api/v1/swagger-ui.html`
- **Frontend React** : `http://localhost`
- **PostgreSQL** : `localhost:5432` (`postgres` / `postgres`)

*Un administrateur bootstrap est créé automatiquement s'il n'existe pas : `admin@itic.fr` / `Admin123!` (modifiable dans `.env`).*

---

## 💻 Démarrage local (Sans Docker)

### 1. Backend Spring Boot

1. Assurez-vous d'avoir un serveur PostgreSQL qui tourne avec une base nommée `itic_cre`.
2. Configurez les variables d'environnement dans `.env` à la racine :
   ```bash
   cp .env.example .env
   ```
3. Lancez le serveur backend :
   ```bash
   cd itic-cre-backend
   mvn spring-boot:run
   ```

### 2. Frontend React

1. Installez les dépendances et lancez le serveur de dev Vite :
   ```bash
   cd itic-cre-frontend
   npm install
   npm run dev
   ```
2. Accédez à l'application sur `http://localhost:5173`.

---

## 🧪 Tests Automatisés

Le backend inclut **31 tests unitaires et d'intégration** couvrant 100% des modules fonctionnels (Authentification, CRM, CV, Gamification, Skill Tree, Jobboard, RGPD, Audit, Dashboard et Emails).

Pour lancer la suite de tests en local :
```bash
cd itic-cre-backend
mvn test
```

Tous les tests sont automatiquement exécutés à chaque déploiement CI/CD via GitHub Actions. Le déploiement sur le serveur est automatiquement interrompu en cas d'échec de test.

---

## 🔑 Rôles & Accès

| Rôle | Inscription / Création | OTP Email |
|---|---|---|
| **STUDENT** | `POST /auth/register` (Public) | Oui (Obligatoire) |
| **ADVISOR** | `POST /auth/admin/users` (Réservé `ADMIN`) | Non (Mot de passe temporaire) |
| **ADMIN** | `POST /auth/admin/users` (Réservé `ADMIN`) | Non (Mot de passe temporaire) |
