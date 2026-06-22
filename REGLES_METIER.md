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

### Tokens
- Access token : expiration par défaut **1h** (`TOKEN_EXPIRATION_TIME=3600000`).
- Refresh token : expiration par défaut **7 jours** (`REFRESH_TOKEN_EXPIRATION_TIME=604800000`).
- Transmis soit en cookie (`token`), soit en header `Authorization: Bearer`.
- Le refresh échoue aussi si `mustChangePassword = true`.

### Promotions
- Nom **unique**.
- Lecture (lister / consulter) : ouverte à **tout utilisateur connecté**, sans restriction de rôle (advisor et étudiant inclus).
- Création / modification / suppression : réservées à `ADMIN` et `ADVISOR`.
- **Une promotion ne peut être supprimée si elle contient au moins un étudiant** (`promotion-has-students`, 400) — il faut d'abord réaffecter ou retirer tous les étudiants de cette promotion.

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

---

## 3. Jobboard — Offres d'emploi

- Création/édition/désactivation réservée à `ADVISOR`/`ADMIN`.
- Un étudiant **ne peut postuler qu'une seule fois** à une offre donnée (`409 already-applied` sinon).
- Postuler via le jobboard crée **automatiquement** une candidature CRM au statut "Postulé", avec la note `"Candidature créée automatiquement via le Jobboard"`.
- XP attribuée à la candidature jobboard : le `gainXP` du statut "Postulé" s'il est **> 0**, sinon repli sur la config générique `CANDIDATURE_CREATED` (jamais les deux à la fois).

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

- Un étudiant a **un seul CV actif** (relation 1:1 `student_id` unique) ; déposer un nouveau fichier **remplace** l'ancien (l'ancien fichier est supprimé du stockage) et repasse le statut à "En attente".
- Statuts par défaut (CRUD complet par l'admin, contrairement aux statuts CRM) : **En attente** (0 XP), **Validé** (30 XP), **À corriger** (0 XP).
- **N'importe quel statut** avec `gainXP > 0` attribue l'XP — pas seulement "Validé" — que ce soit atteint via le dépôt initial ou un changement manuel par un conseiller.
- Un flag `xpAwarded` empêche de re-toucher l'XP en rebasculant entre statuts pour le **même** fichier déposé.
- `xpAwarded` se **réinitialise à `false`** à chaque nouveau dépôt de CV — un étudiant peut donc re-gagner l'XP de validation sur une nouvelle version corrigée de son CV.
- Les commentaires de conseiller sur un CV déclenchent un email à l'étudiant (asynchrone, après commit de la transaction).

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
- Actions tracées : `LOGIN`, `LOGOUT`, `STUDENT_REGISTERED`, `STAFF_USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `EMAIL_VERIFIED`, `CV_UPLOADED`, `CV_VALIDATED`, `CV_REJECTED`, `CV_DELETED`, `CV_STATUS_UPDATED`, `CV_COMMENTED`, `TUTO_CREATED`, `TUTO_UPDATED`, `TUTO_DELETED`, `OTHER`.

---

## Notes de fiabilité de ce document

- Ce document a été construit en lisant le code source directement (pas le cahier des charges initial, qui contient des écarts connus — ex: grades "Bronze→Platine" jamais implémentés, statuts CRM légèrement différents de la première spec).
- Toute règle ci-dessus peut devenir obsolète si le code évolue sans que ce fichier soit mis à jour en parallèle — en cas de doute, le code reste la source de vérité.
