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
  - Panneau **Configuration Applicative System & RGPD** (`AppConfigCard`) : Ajustement dynamique en temps réel des seuils applicatifs (`STALE_ALERT_DAYS`, `PROMOTION_REMINDER_MONTHS`, `GDPR_OTP_RETENTION_HOURS`, `GDPR_AUDIT_LOG_RETENTION_DAYS`, `GDPR_INACTIVE_STUDENT_RETENTION_DAYS`).
  - Gouvernance Multi-Admin (Plafond de 2 admins actifs, masquage de la réinitialisation MDP pour les admins).
  - Admin-en-tant-que-conseiller : un administrateur peut s'auto-assigner des étudiants (et être assigné par un autre admin) au même titre qu'un conseiller — toggle "Vue globale / Mon portefeuille" sur le dashboard, checkbox "Mes étudiants uniquement" sur Étudiants/Candidatures/CV Validation.
- **Espace CRM Étudiant** : Suivi des candidatures en liste + détail (création, changement de statut, gain XP) — pas de Kanban.
- **Jobboard** : Consultation des offres d'emploi avec postulation directe auto-linkée au CRM.
- **Gestion des CV** : Upload de CV PDF, examen conseiller, statuts et commentaires.
- **Gamification & Skill Tree** : Progression XP, badges, grades dynamiques et validation de quiz.
- **Journal d'Audit & RGPD** : Historique complet des actions administratives.

