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
| **Photo de profil** | `ProfilePictureUploadIntegrationTest.java` | 5 | Upload de photo de profil (formats acceptés, taille max, remplacement de l'ancienne photo). |
| **Gouvernance Admin & RBAC** | `UserGovernanceIntegrationTest.java` | 9 | Plafond de 2 admins actifs, auto-désactivation interdite, protection du dernier admin actif, interdiction de suppression physique admin, interdiction de réinitialiser le mot de passe d'un admin par un tiers, restriction des désactivations par rôle (Advisor désactive uniquement Student). |
| **Affectation Conseiller (Admin-en-tant-que-conseiller)** | `AdvisorAssignmentIntegrationTest.java` | 26 | Affectation/retrait étudiant↔conseiller, un admin assignable comme conseiller référent au même titre qu'un conseiller, admins assignables entre eux, scoping du dashboard admin ("vue globale" vs `advisorId` précis). |
| **Specifications & Filtres Etudiants** | `StudentSpecificationIntegrationTest.java` | 8 | Filtrage dynamique JPA Specification (nom, prénom, email, promotions, statut actif/inactif, seuil d'inactivité, étudiants nécessitant une action) et filtre "sous contrat" (`underContract`) : déclaration vérifiée vs en attente, pas de cumul de postes (seule la plus récente compte), exclusion sur date de fin dépassée, comptage même avant que la date de début soit atteinte. |
| **CRM Candidatures** | `ApplicationServiceIntegrationTest.java`, `ApplicationSpecificationIntegrationTest.java`, `ApplicationStatusConcurrencyIntegrationTest.java` | 11 | Création de candidatures CRM, transition de statuts, attribution de points XP au premier passage, calcul des candidatures stagnantes (`stale`), filtrage dynamique par entreprise/statut/conseiller, cohérence sous changement de statut concurrent, date de début obligatoire pour atteindre un statut "vaut contrat", validation des dates de contrat. |
| **CV & Validation** | `CVIntegrationTest.java`, `CVSpecificationIntegrationTest.java` | 9 | Dépôt unique de fichier PDF, remplacement du CV, changement de statut par le conseiller, calcul du cycle de validation, prévention du double gain d'XP et filtrage multicritères. |
| **Dashboard (API & Services)** | `DashboardControllerIntegrationTest.java` (+ sous-classes `OverviewAndStatsTests`, `ApplicationsEndpointsTests`, `StudentsEndpointsTests`, `StudentNotificationTests`, `SecurityTests`, `ContractStatusTests`), `DashboardServiceIntegrationTest.java`, `StudentDashboardIntegrationTest.java` | 51 | Calcul de la progression du tableau de bord étudiant, rang du classement, résumé des statistiques staff/conseiller, génération dynamique de la liste des tâches à faire, endpoints REST du dashboard staff (overview, candidatures, étudiants, relance, sécurité RBAC), exposition de `viaJobboard`/instantané de l'offre par le chemin de mapping séparé d'`ApplicationReportingService`. Suivi "sous contrat" (`ContractStatusTests`) : édition des dates par un conseiller (`PATCH .../contract-dates`, y compris par un conseiller non assigné à l'étudiant — accès ouvert à tout conseiller/admin), vérification/refus d'une déclaration (`POST .../verify-contract`, `.../reject-contract`) avec journal d'audit, révocation de l'XP au refus, filtre/compteur `underContract` et visibilité par défaut d'une déclaration non encore vérifiée. |
| **Confidentialité & RGPD** | `GdprIntegrationTest.java` | 6 | Droit à la portabilité (export complet au format JSON) et droit à l'oubli (anonymisation irréversible, désactivation de compte via `GdprPurgeScheduler`, distinction statistiques "portefeuille" vs "activité"). |
| **Skill Tree / Tutos** | `SkillTreeIntegrationTest.java` | 4 | Navigation dans l'arbre de compétences, calcul des articles lus, soumission de quiz avec calcul de score exact et export/import de l'arbre. |
| **Jobboard / Offres** | `JobOfferIntegrationTest.java`, `SectorIntegrationTest.java`, `JobOfferSpecificationIntegrationTest.java`, `JobboardExternalSyncIntegrationTest.java` | 47 | Création/édition des offres ITIC, CRUD des secteurs, filtrage/recherche via Specifications (actif, contrat, localisation), postulation ITIC **et externe** avec instantané de l'offre copié dans la candidature CRM, seuil hebdomadaire anti-farming d'XP, suppression d'offre jamais bloquée par une candidature liée (détachement automatique), agrégation externe (France Travail/Adzuna/La Bonne Alternance) : dédoublonnage, pagination, expiration calculée ou réelle selon la source, nettoyage automatique des offres périmées, désactivation de source admin-only. Détail exhaustif test par test : [TESTS_JOBBOARD_EXTERNE.md](./TESTS_JOBBOARD_EXTERNE.md). |
| **Gamification** | `GamificationIntegrationTest.java` | 1 | Attribution et révocation de points XP, mise à jour du classement et passage dynamique de grades (Débutant → Intermédiaire → Avancé → Expert). |
| **Journal d'Audit** | `AuditLogIntegrationTest.java` | 2 | Traçabilité des actions sensibles (`STAFF_USER_CREATED`, `CV_VALIDATED`, etc.), capture de l'adresse IP/User-Agent et filtrage multicritères. |
| **Templates d'Emails** | `EmailTemplateServiceTest.java` | 6 | Rendu des modèles HTML d'emails (OTP de vérification, identifiants de compte staff, notification CV par statut/commentaire, rappel étudiant, refus de déclaration "sous contrat"). |
| **Configuration Applicative** | `AppConfigurationIntegrationTest.java` | 4 | Seuils RGPD/métier configurables en BDD (`app_configuration`), lecture/écriture réservée `ADMIN`, prise en compte sans redémarrage. |
| **Stockage Fichiers** | `FileAccessIntegrationTest.java` | 7 | Accès et upload de fichiers vers le stockage Cloud/Local (`ICloudStorage`), contrôle des permissions d'accès aux fichiers privés. |

**Total : 207 tests d'intégration automatisés — 100% SUCCESS.**

---

## 3. Exécution Automatisée dans la CI/CD

L'exécution des tests est strictement intégrée au pipeline d'intégration et de déploiement continu **GitHub Actions** ([.github/workflows/cd.yml](file:///.github/workflows/cd.yml)).

### Fonctionnement de la Pipeline :
1. **Étape Build Backend** : Commande `mvn -B package` (sans l'option `-DskipTests`).
2. **Exécution des 207 tests** : Tous les tests unitaires et d'intégration sont exécutés sur la base H2 en mémoire.
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
