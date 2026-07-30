# ITIC CRE — Frontend Application

Client React responsive et multilingue pour la plateforme **ITIC CRE** (Relations Entreprises & Espace Étudiant).

## Stack Technique

* **Framework** : Vite + React 18 + TypeScript
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

- **Espace Relations Entreprises (Gestion du Personnel)** :
  - Onglets distincts pour la gestion des **Conseillers** et des **Administrateurs**.
  - Filtrage, recherche dynamique et pagination indépendante par rôle (`role=ADVISOR`, `role=ADMIN`).
  - Gouvernance Multi-Admin (Plafond de 2 admins actifs, masquage de la réinitialisation MDP pour les admins).
- **Espace CRM Étudiant** : Pipeline Kanban de suivi des candidatures (création, changement de statut, gain XP).
- **Jobboard** : Consultation des offres d'emploi avec postulation directe auto-linkée au CRM.
- **Gestion des CV** : Upload de CV PDF, examen conseiller, statuts et commentaires.
- **Gamification & Skill Tree** : Progression XP, badges, grades dynamiques et validation de quiz.
- **Journal d'Audit & RGPD** : Historique complet des actions administratives.

