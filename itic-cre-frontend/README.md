# ITIC CRE — Frontend Application

Client React responsive et multilingue pour la plateforme **ITIC CRE** (Relations Entreprises & Espace Étudiant).

## Stack Technique

* **Framework** : Vite + React 19 + TypeScript
* **Design & Style** : Tailwind CSS + Lucide Icons + Framer Motion
* **State Management** : Zustand (auth, ui)
* **Routing** : React Router DOM
* **API & Cache** : TanStack React Query + Axios (interceptors JWT)
* **Internationalisation** : i18next (`fr` / `en`)
* **Notifications** : Sonner (Toasts)

## Démarrage local

1. **Installer les dépendances** :
```bash
npm install
```

2. **Configurer l'environnement** :
```bash
cp .env.example .env
```

3. **Lancer le serveur de développement** :
```bash
npm run dev
```

Application accessible sur : `http://localhost:5173`

## Fonctionnalités Principales

- **Espace Relations Entreprises (Gestion du Personnel & Admin)** :
  - Onglets distincts pour la gestion des **Conseillers** et des **Administrateurs**.
  - Navigation Admin : Menu principal renommé en **Paramètres** avec onglets bilingues ("Paramètres du Compte" & "Configuration Applicative").
  - Panneau **Configuration Applicative System & RGPD** (`AppConfigCard`) : Ajustement dynamique en temps réel des seuils applicatifs (`STALE_ALERT_DAYS`, `PROMOTION_REMINDER_MONTHS`, `INACTIVE_STUDENT_DAYS`, `GDPR_OTP_RETENTION_HOURS`, `GDPR_AUDIT_LOG_RETENTION_DAYS`, `GDPR_INACTIVE_STUDENT_RETENTION_DAYS`, `JOBBOARD_SYNC_MAX_PER_PROVIDER`, `JOBBOARD_OFFER_EXPIRATION_DAYS`, `JOBBOARD_OFFER_DELETE_AFTER_DAYS`, `APPLICATION_XP_WEEKLY_LIMIT`).
  - Gouvernance Multi-Admin (Plafond de 2 admins actifs, masquage de la réinitialisation MDP pour les admins).
  - Admin-en-tant-que-conseiller : un administrateur peut s'auto-assigner des étudiants (et être assigné par un autre admin) au même titre qu'un conseiller — toggle "Vue globale / Mon portefeuille" sur le dashboard, checkbox "Mes étudiants uniquement" sur Étudiants/Candidatures/CV Validation.
- **Espace CRM Étudiant** : Suivi des candidatures en liste + détail (création, changement de statut, gain XP) — pas de Kanban.
- **Suivi "sous contrat"** : déclaration purement étudiante ("Offre reçue", dates de début/fin éditables), badge "À vérifier" côté étudiant en attendant confirmation. Côté conseiller (ouvert à tout conseiller/admin, pas seulement l'affecté) : badge visible directement sur la carte candidature/étudiant sans ouvrir le détail, boutons "Marquer comme vérifié"/"Refuser l'offre", édition des dates, et carte d'alerte dédiée sur le dashboard ("Contrats à vérifier", empilée avec l'alerte de relance dans la même carte). Filtre 3 états (Tous / Sous contrat / Pas sous contrat) sur Étudiants et Candidatures, exclusion par défaut limitée aux déclarations déjà vérifiées.
- **Jobboard** : Offres ITIC et agrégation multi-source (France Travail, Adzuna, La Bonne Alternance) dans une même liste filtrable par mot-clé, type de contrat, secteur, localisation et source — postulation directe auto-linkée au CRM (candidature avec instantané complet de l'offre), disponible pour toutes les sources. Panneau admin dédié (Offres → Offres externes) : activer/désactiver chaque source, éditer ses critères de recherche (codes ROME, départements, mots-clés, catégorie, employeurs exclus) sans redéploiement, déclencher une synchronisation manuelle, suivre le dernier résultat de synchro par source.
- **Gestion des CV** : Upload de CV PDF, examen conseiller, statuts et commentaires.
- **Gamification & Skill Tree** : Progression XP, badges, grades dynamiques et validation de quiz.
- **Journal d'Audit & RGPD** : Historique complet des actions administratives.

