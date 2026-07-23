# Couverture et Architecture des Tests — ITIC CRE

Ce document décrit l'architecture globale des tests de la plateforme ITIC CRE, la suite de tests automatique exécutée dans la CI/CD et la couverture intégrale module par module.

---

## 1. Architecture de Test Backend

La plateforme backend `itic-cre-backend` s'appuie sur une stratégie d'intégration globale combinant des tests d'intégration Spring Boot (`@SpringBootTest`), des tests d'API Web MockMvc (`@AutoConfigureMockMvc`) et des tests unitaires ciblés.

### Stack de Test
- **Framework de test** : JUnit 5 (Jupiter) & AssertJ (`assertThat`)
- **Isolation de la base de données** : Base relationnelle en mémoire **H2** en mode PostgreSQL (`jdbc:h2:mem:itic_cre_test`)
- **Gestion des transactions** : Chaque classe de test est annotée avec `@Transactional`, garantissant un rollback automatique à la fin de chaque test sans impacter les autres exécutions.
- **Sécurité et contexte** : Injection des principaux identifiants JWT dans le `SecurityContextHolder` via `UsernamePasswordAuthenticationToken` avec des rôles réalistes (`STUDENT`, `ADVISOR`, `ADMIN`).
- **Services externes** : Mocks isolés (`@MockBean`) pour `ICloudStorage` et `JavaMailSender` afin d'éviter tout appel réseau pendant la phase de build.

---

## 2. Matrice de Couverture par Module

Toutes les briques applicatives principales du backend sont couvertes par des suites de tests dédiées :

| Module | Suite de test (`src/test/java/...`) | Nombre de tests | Aspect vérifié |
|---|---|---|---|
| **Auth & Sécurité** | `AuthenticationIntegrationTest.java` | 11 | Inscription étudiant, OTP email, login JWT, comptes staff avec mot de passe temporaire, changement de mot de passe obligatoire (`mustChangePassword`), modification de profil, scoping d'accès. |
| **CRM Candidatures** | `ApplicationServiceIntegrationTest.java` | 4 | Création de candidatures CRM, transition de statuts, attribution de points XP au premier passage, calcul des candidatures stagnantes (`stale`). |
| **CV & Validation** | `CVIntegrationTest.java` | 3 | Dépôt unique de fichier PDF, remplacement du CV, changement de statut par le conseiller, calcul du cycle de validation et prévention du double gain d'XP. |
| **Dashboard Étudiant** | `StudentDashboardIntegrationTest.java` | 3 | Calcul de la progression du tableau de bord étudiant, rang du classement, résumé des statistiques et génération dynamique de la liste des tâches à faire. |
| **Confidentialité & RGPD** | `GdprIntegrationTest.java` | 2 | Droit à la portabilité (export complet au format JSON) et droit à l'oubli (anonymisation irréversible et désactivation de compte). |
| **Skill Tree / Tutos** | `SkillTreeIntegrationTest.java` | 4 | Navigation dans l'arbre de compétences, calcul des articles lus, soumission de quiz avec calcul de score exact et export/import de l'arbre. |
| **Jobboard / Offres** | `JobOfferIntegrationTest.java` | 3 | Création et édition des offres d'emploi par les conseillers, filtrage/recherche d'offres actives et postulation en 1-clic avec génération automatique de candidature CRM. |
| **Gamification** | `GamificationIntegrationTest.java` | 1 | Attribution et révocation de points XP, mise à jour du classement et passage dynamique de grades (Débutant → Intermédiaire → Avancé → Expert). |
| **Journal d'Audit** | `AuditLogIntegrationTest.java` | 2 | Traçabilité des actions sensibles (`STAFF_USER_CREATED`, `CV_VALIDATED`, etc.), capture de l'adresse IP/User-Agent et filtrage multicritères. |
| **Templates d'Emails** | `EmailTemplateServiceTest.java` | 1 | Rendu des modèles HTML d'emails (OTP de vérification, réinitialisation de mot de passe, notification de commentaire CV). |

**Total : 31 tests automatisés — 100% SUCCESS.**

---

## 3. Exécution Automatisée dans la CI/CD

L'exécution des tests est strictement intégrée au pipeline d'intégration et de déploiement continu **GitHub Actions** ([.github/workflows/cd.yml](file:///.github/workflows/cd.yml)).

### Fonctionnement de la Pipeline :
1. **Étape Build Backend** : Commande `mvn -B package` (sans l'option `-DskipTests`).
2. **Exécution des 31 tests** : Tous les tests unitaires et d'intégration sont exécutés sur la base H2 en mémoire.
3. **Protection contre le Déploiement Cassé** : Si une assertion échoue ou qu'un bug est introduit, le job `build-and-compile` échoue immédiatement.
4. **Annulation Automatique** : Le job de déploiement `deploy` (qui dépend de la réussite du build) est automatiquement **annulé**, et une alerte explicite contenant le commit et l'erreur est envoyée sur Discord.

---

## 4. Lancer les Tests en Local

Pour vérifier la conformité du code localement avant tout push Git :

```bash
cd itic-cre-backend
mvn test
```

Pour lancer une suite de test spécifique :
```bash
mvn test -Dtest=AuthenticationIntegrationTest
```
