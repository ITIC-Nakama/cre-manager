# Mise en production de la pile #71 → #97, puis du lot 10

*Rédigé le 17/11/2026 (lot 9). Pile #71 → #97 mise en ligne le 18/11/2026 (`main` = `2239a1a`, Flyway 61). Lot 10 (adresse, fin des demandes d'aide, Espace entreprise masqué, types de contrat, plafond à 4) : **§9**.*

Ce document dit ce qui part en production, ce qui change dès le lendemain, ce qui reste coupé, les risques, et la procédure du jour J (avec le retour arrière). Tout ce qu'il décrit a été joué sur une base jetable de taille réaliste, sauf mention contraire.

## En bref

- **17 PR** (#71, #82 à #97), **11 migrations** (V51 à V61) : messagerie, notes des étudiants, brouillons d'offres, Espace entreprise, cartes, récapitulatif du lundi, sources d'offres, matching, fiche formation, alertes et vue par formation, suppression définitive des comptes.
- **Dès le lendemain, sans rien activer**, deux sortes d'e-mails peuvent partir :
  - l'e-mail du soir (18 h), seulement si l'équipe coche des « Promotions ciblées » sur une offre ;
  - les avis « Vous avez un nouveau message » de la messagerie.
- **Coupé par défaut** :
  - le récapitulatif du lundi ;
  - les alertes instantanées ;
  - l'Espace entreprise (fermé, accès par lien privé) ;
  - JSearch.
- **Migrations** sur une copie jetable de taille réaliste : 0,26 s, aucune donnée existante modifiée hors des reprises prévues (empreinte identique avant / après).
- **Retour arrière** : possible, à condition de passer d'abord un script SQL de trois lignes (testé).

---

## 1. Ce qui part en production, PR par PR

« Équipe » = conseillers et admins du CRE. « Couper » = ce qu'on fait si la fonctionnalité pose problème, sans retour arrière complet.

| PR | Étudiants | Équipe | Entreprises | Migration | Variable | Couper |
|---|---|---|---|---|---|---|
| **#71** comptes de test | — | — | — | — | `TEST_*_PASSWORD` (vides) | rien à couper |
| **#82** photo WebP du CV | Photo WebP acceptée, redressée | — | — | — | — | retour arrière |
| **#83** messagerie (serveur) | — | « Envoyer un message » : 4000 caractères (au lieu de 1000) | — | V51 (3 tables neuves) | — | retour arrière |
| **#84** e-mails de messagerie | E-mail « Vous avez un nouveau message » (sans le texte) quand l'équipe écrit ; l'ancien e-mail « Rappel de votre conseiller » disparaît | Le référent reçoit le même avis quand son étudiant écrit | — | V52 (colonnes d'une table neuve) | `APP_MESSAGING_NOTIFICATION_SCHEDULER_ENABLED` (vrai) | rappels : variable ; avis immédiat : retour arrière |
| **#85** onglet Conversations | — | Menu « Conversations » ; « Messages » devient « Demandes d'aide » | — | — | — | retour arrière |
| **#86** page Messages | Menu « Messages » (fil avec l'équipe) | — | — | — | — | retour arrière |
| **#87** corrections du Drive | Préférence « Offres ciblées du soir » (activée) | Note de 1 à 5 avec historique (au lieu des étoiles) ; brouillons d'offres ; « Promotions ciblées » ; les CV d'étudiants au contrat **déclaré** sortent des listes de CV ; brouillons de formulaires | — | V53 (notes reprises des étoiles), V54 (offres de l'équipe datées) | `APP_MAILING_TARGETED_OFFERS_ENABLED` (vrai), `APP_MAILING_TARGETED_OFFERS_CRON` (18 h) | e-mail du soir : variable |
| **#88** Espace entreprise | Interrupteur « Apparaître dans l'Espace entreprise » (activé) | Menu « Espace entreprise » (formations, demandes, statistiques, textes et accès) | Annuaire public des CV validés, « Ce profil m'intéresse » | V55 (5 tables, code `VALIDE` posé sur le statut « Validé ») | `APP_COMPANY_SPACE_PRIVATE_BY_DEFAULT` (vrai, lot 9) | fermé par défaut ; l'admin l'ouvre ou le referme dans « Textes et accès » |
| **#89** carte des étudiants | Code postal facultatif ; bandeau sur le tableau de bord tant qu'il est vide | Menu « Cartes » | — | V56 (2 colonnes, 1 index) | — | retour arrière |
| **#90** récapitulatif du lundi | E-mail du lundi 8 h (10 offres au plus) | Codes ROME et mots-clés par formation | — | V57 | `APP_MAILING_WEEKLY_DIGEST_ENABLED` (**faux**, lot 9), `APP_MAILING_WEEKLY_DIGEST_CRON` | variable |
| **#91** sources d'offres | Offres externes : Île-de-France par défaut, élargies aux 31 codes ROME des formations, doublons écartés | 2 réglages dans « Offres externes » (cochés), onglet JSearch | — | V58 | `JOBBOARD_JSEARCH_*` (coupé) | décocher les 2 réglages |
| **#92** matching | « Recommandées pour toi » sur la page Offres | ✨ « Candidats suggérés » sur une offre | — | — | — | retour arrière |
| **#93** fiche formation | Bouton « Ma fiche formation » (si la formation a une page) | Champ « Fiche formation » | — | V59 | — | vider l'adresse de la formation |
| **#94** alertes et formations | « Offres pour ma formation » par défaut sur la page Offres (repli automatique sur « Toutes les offres » si vide) | Formations ciblées à la publication, onglet Formations, filtres et tri par formation, carte des offres, 🔔 aperçu des destinataires | « Contactez-nous » appelle le 01 43 73 20 40 | V60 | `APP_MAILING_INSTANT_OFFERS_*` (coupé) | variable ; interrupteur par formation |
| **#95** lot 9 | — | Suppression définitive d'un compte (admin) ; « Anonymiser (RGPD) » renommé | — | V61 (auteur de commentaire facultatif, drapeau de rattachement) | voir §3 | retour arrière |
| **#97** type de contrat France Travail | Les offres d'apprentissage et de professionnalisation France Travail apparaissent en « Alternance » (filtre et compteurs), même sans le mot dans leur intitulé | Compteurs d'alternance en hausse | — | — | — | retour arrière (les offres déjà requalifiées restent en Alternance) |
| **#96** rappel de messagerie après 1 h | L'e-mail « Vous avez un nouveau message » ne part que si le message est resté non lu 1 h ; un seul rappel par série non lue | Même règle pour le référent | — | — | `APP_MESSAGING_EMAIL_DELAY_MINUTES` (60) | variable, ou retour arrière |

## 2. Ce qui change pour les utilisateurs existants dès le déploiement (sans activer aucune variable)

**C'est la section à lire avant le « go ».** Tout ce qui suit est visible le lendemain.

### 2.1 E-mails qui peuvent partir

| E-mail | Quand | À qui | Combien le premier jour |
|---|---|---|---|
| **E-mail du soir** « offres pour votre promotion » | 18 h, chaque jour | étudiants actifs, sans contrat, d'une promotion cochée dans « Promotions ciblées » d'une offre publiée le jour même | **0** tant que personne ne coche de promotion. Recette : une offre ciblée a envoyé 20 e-mails (une promotion) |
| **« Vous avez un nouveau message »** | **si un message est resté non lu 1 h** (un seul rappel par série non lue, pas de relance avant lecture ; #96) | l'étudiant (si l'équipe écrit) ou son référent (si l'étudiant écrit) | dépend de l'usage. Le bouton existant « Envoyer un message » écrit désormais dans la conversation et envoie cet avis |
| Compte réactivé | quand un compte est réactivé | l'étudiant | inchangé (déjà en prod) |

**Ne part pas** :
- le récapitulatif du lundi (coupé par défaut : sinon 274 e-mails dans la recette, soit la plupart des étudiants actifs sans contrat) ;
- les alertes instantanées ;
- les e-mails des demandes d'entreprises (l'adresse prévenue est vide).

### 2.2 Écrans et comportements

**Étudiants**
- Nouveaux menus « Messages » (fil avec l'équipe).
- **Page Offres**
  - « Recommandées pour toi » en haut.
  - **« Offres pour ma formation » est choisi par défaut.** Les offres déjà en ligne sont rattachées à leurs formations au premier démarrage : 2 763 offres sur 2 766 dans la recette. Si aucune offre n'est rattachée à la formation de l'étudiant, la page bascule seule sur « Toutes les offres », avec une phrase d'explication.
- **Tableau de bord**
  - un bandeau demande le code postal (« Plus tard » le masque) ;
  - bouton « Ma fiche formation ».
- **Profil** : interrupteurs « Offres ciblées du soir » et « Récapitulatif du lundi » (activés), « Apparaître dans l'Espace entreprise » (activé), code postal. L'interrupteur des alertes instantanées n'apparaît que si elles sont activées.

**Équipe**
- **Menus**
  - « Messages » devient **« Demandes d'aide »** ;
  - nouveaux : « Conversations », « Espace entreprise », « Cartes ».
- **Notes des étudiants** : note de 1 à 5 avec commentaire et historique, **à la place des étoiles**. Les étoiles existantes sont converties : 0 → 2, 1 → 3, 2 → 4, 3 → 5. Recette : 190 notes reprises sur 190.
- **Listes de CV et leurs compteurs** : un étudiant dont le contrat est seulement **déclaré** (pas encore vérifié) en sort aussi.
  - Les chiffres baissent : 292 → 149 CV sur le jeu de recette, où beaucoup d'étudiants ont une candidature au statut « Offre reçue ».
  - C'est la règle demandée par Jules dans le Drive.
- **« Étudiants à relancer »** du tableau de bord : même règle (contrat déclaré). Il trie maintenant les ex aequo par nom (avant : ordre aléatoire).
- **« Envoyer un message »** écrit dans la conversation de l'étudiant (l'e-mail ne contient plus le texte). Le bouton est masqué pour un compte désactivé.
- **Offres**
  - « Enregistrer comme brouillon » / « Publier » ;
  - « Promotions ciblées » ;
  - **« Formations ciblées » obligatoire pour publier** une nouvelle offre ou un brouillon. Une offre déjà publiée se réenregistre sans.
  - Colonne, filtre et tri « Formation(s) », onglet « Formations ».
- **Fiche étudiant**
  - l'admin a un bouton **« Supprimer définitivement »** ;
  - l'ancien bouton « Supprimer le compte » (anonymisation RGPD) s'appelle désormais **« Anonymiser (RGPD) »**.

**Entreprises**
- L'Espace entreprise est **fermé** au déploiement : les pages publiques répondent « lien non valide » sans la clé privée. L'admin l'ouvre dans Espace entreprise → Textes et accès, quand l'école le décide.

**Nuit suivante (synchro de 2 h)**
- France Travail et La Bonne Alternance cherchent aussi les 31 codes ROME des formations, avec l'Île-de-France par défaut pour les sources sans zone.
- Les offres importées sont rattachées automatiquement à des formations.
- **France Travail (#97)** : le type de contrat vient de la nature du contrat (`natureContrat`). Apprentissage et professionnalisation donnent « Alternance », et l'intitulé ne sert plus qu'en secours. Les offres France Travail **déjà en base** que l'API renvoie à cette synchro et classe en alternance passent en « Alternance ». Aucune requête manuelle n'est faite en prod, et rien d'autre n'est modifié. Les offres que la synchro ne renvoie plus gardent leur libellé jusqu'à leur expiration (30 j).
  - **Contrôle le lendemain** : `journalctl -u itic-backend --since today | grep "passées en alternance"` → « FRANCE_TRAVAIL : … N déjà connues passées en alternance ». Le nombre attendu est mesuré par `scripts/mesures/comptage_offres.sh`, rubrique [2b].

### 2.3 Données existantes modifiées par les migrations

- **Notes** (V53) : une note sur 5 est créée pour chaque étudiant qui avait des étoiles.
- **Offres de l'équipe** (V54) : la date de publication = la date de création.
- **Statuts de CV** (V55) : le code `VALIDE` est posé sur le statut « Validé ».
- **Étudiants** : préférences d'e-mail et « Apparaître dans l'Espace entreprise » à vrai pour tous.
- **Synchro des offres externes** (V58) : 2 réglages à vrai.
- **Au premier démarrage** (une seule fois) : 39 formations, leurs codes ROME, mots-clés et pages, puis le rattachement des offres en ligne, sans aucune alerte : 14 s pour 3 223 offres dans la recette fictive, **environ 4 à 5 minutes au volume réel de la prod** (recette sur une copie restaurée de la sauvegarde de prod, voir §6.4). L'API répond pendant ce temps.

Tout le reste est inchangé : l'empreinte des 12 tables existantes est identique avant et après les migrations (`scripts/nonreg/data_fingerprint.sql`).

## 3. Ce qui reste coupé par défaut

| Fonction | Variable (dans le `.env` de prod, secret GitHub `BACKEND_ENV_CONTENT`) | Effet quand on l'allume |
|---|---|---|
| Récapitulatif du lundi | `APP_MAILING_WEEKLY_DIGEST_ENABLED=true` | Chaque lundi 8 h, jusqu'à 10 offres par étudiant actif sans contrat ayant une formation (274 e-mails sur le jeu de recette) |
| Alertes instantanées | `APP_MAILING_INSTANT_OFFERS_ENABLED=true` (réglages : `_WINDOW_MINUTES` 10, `_DAILY_CAP` 5) | E-mail aux étudiants de la formation à chaque offre publiée ou importée ; 5 par jour au plus, le surplus le soir |
| Espace entreprise ouvert | dans le back-office (Textes et accès : décocher « accès par lien privé ») | Annuaire public des CV validés des étudiants qui ne s'y sont pas opposés |
| E-mail des demandes d'entreprises | back-office : adresse prévenue | Chaque demande d'entreprise part à cette adresse |
| JSearch | `JOBBOARD_JSEARCH_ENABLED=true` + `JOBBOARD_JSEARCH_API_KEY` | Offres de l'agrégateur, plafond 100 appels / mois |

Pour **couper** ce qui est allumé par défaut :
- `APP_MAILING_TARGETED_OFFERS_ENABLED=false` (e-mail du soir) ;
- `APP_MESSAGING_NOTIFICATION_SCHEDULER_ENABLED=false` (rappels de messagerie).

Pour **régler** le délai des rappels de messagerie : `APP_MESSAGING_EMAIL_DELAY_MINUTES` (minutes, **60** par défaut, #96).

Ces noms sont lus que le `.env` soit chargé par systemd ou importé comme fichier de propriétés (lot 9, test `ConfigSwitchesTest`). Avant, ils n'étaient lus que dans le premier cas.

## 4. Les risques, du plus grave au moins grave

| # | Risque | Ce qui le couvre |
|---|---|---|
| 1 | **Retour arrière du code sans précaution** : l'ancien code renvoie 500 sur tout ce qui touche aux CV (code `VALIDE` inconnu), et montrerait les brouillons d'offres aux étudiants | Reproduit puis réglé par `scripts/rollback/avant_retour_arriere.sql` (testé : tout répond 200 ensuite). Procédure au §7.6 |
| 2 | **E-mails en masse le premier jour** (récapitulatif à toute l'école, alertes) | Récapitulatif et alertes coupés par défaut (test `ConfigSwitchesTest`, recette « interrupteurs » 5/5) ; activation une par une au §7.5 |
| 3 | **CV d'étudiants publics sans annonce** (Espace entreprise ouvert d'office, « opt-out ») | Fermé par défaut au premier démarrage (test). À ouvrir après information des étudiants et accord du DPO |
| 4 | **Liste d'offres vide pour les étudiants** (filtre « ma formation » par défaut, aucune offre rattachée) | Rattachement des offres en ligne au premier démarrage (99,9 % en recette) + repli automatique sur « Toutes les offres » (tests serveur et Vitest) |
| 5 | **Ancien bundle (service worker) contre la nouvelle API** : la cause aggravante de l'incident des CV | L'ancien front de `main` a été passé sur la nouvelle API, écran par écran : aucune erreur nouvelle (41 écrans). Aucune lecture existante n'a perdu ou changé de champ (207 lectures comparées) |
| 6 | **Interrupteurs sans effet** (variables non lues) | Lignes ajoutées dans `application.properties` ; test qui échoue si un interrupteur n'y figure pas |
| 7 | **Lenteurs déjà présentes avec beaucoup de données** : tableau de bord admin 8 s, liste « pas sous contrat » 3,7 s (7 000 candidatures) | Mesuré identique ou pire sur `main` (13 s, 3,6 s) : pas une régression. À traiter à part (requêtes de comptage) |
| 8 | **Durée du premier démarrage** (rattachement des offres) | 4 à 5 min au volume réel (copie de prod), mais l'API répond en ~30 s et les connexions restent rapides pendant le rattachement : le contrôle de santé du déploiement (60 s) passe. Pendant ces minutes, « Offres pour ma formation » bascule sur « Toutes les offres » |
| 9 | **Lien d'un e-mail ouvert avec l'ancien bundle** (désinscription, messagerie) : l'ancien front ne connaît pas ces adresses et renvoie au tableau de bord | Rare (première visite après le déploiement, avant mise à jour du service worker, ≤ 15 min) ; le lien refonctionne au clic suivant. Non corrigé (voir §5) |
| 10 | **Quota des API d'offres** : 31 codes ROME en plus | Plafond par source déjà en place ; lire le journal de synchro après la première nuit |

## 5. Leçon de l'incident des CV

**Ce qui s'était passé** (SUIVI.md, 13/11) :
- un étudiant **sans CV** recevait un 404 sur `GET /cv/me` ;
- le front le prenait pour une erreur, réessayait et remontait la page en boucle (55 à 300 requêtes en 6 s) ;
- ni les tests ni la recette ne l'ont vu, parce que **tous les comptes de recette avaient un CV** ;
- puis, après le correctif, **l'ancien bundle** servi par le service worker continuait d'appeler la nouvelle API.

**La règle** : *tester l'état vide et l'ancien front contre la nouvelle API, pas seulement la nouveauté avec des comptes bien remplis.* Concrètement :
1. Chaque écran est rejoué avec un compte **sans promotion, sans CV, sans candidature, sans référent**.
2. Une erreur 4xx n'est **jamais** relancée automatiquement (réglage global du front).
3. Les réponses d'API existantes ne perdent aucun champ et ne changent pas de forme ; on ne fait qu'ajouter.
4. Avant le « go », l'ancien front est passé sur la nouvelle API.

**Comment elle a été appliquée dans cette mise en prod** :
- **Revue de la pile** (lecture du code de #71 à #94) pour ce type d'erreur. Corrigé dans #95, avec un test qui échouait avant :
  - **liste d'offres vide** le lendemain (filtre « ma formation » sans aucun rattachement) → rattachement initial + repli. Tests : `AccountDeletionIntegrationTest.backfillsExistingOffers`, `ConfigSwitchesTest.backfillRunsAfterProgramsOnce`, Vitest « bascule sur Toutes les offres » ;
  - **toutes les requêtes du front réessayaient 3 fois, même sur un 404/403** (la garde de l'incident ne couvrait que le CV) → garde globale (Vitest « jamais de nouvel essai sur une erreur 4xx ») ;
  - **page Offres blanche ~7 s** si la formation de l'étudiant ne se charge pas → affichage immédiat (Vitest « la liste s'affiche quand même ») ;
  - **offre déjà publiée impossible à réenregistrer** sans choisir de formation → formation exigée seulement à la publication (Vitest) ;
  - **commentaire de CV d'un conseiller supprimé** : plantage (500) de la fiche étudiant → « Compte supprimé » (test d'intégration) ;
  - **« Envoyer un message » proposé pour un compte désactivé**, que le serveur refuse (409) → bouton masqué.
- **Recette** :
  - comptes vides (`etudiant_vide`) dans la comparaison d'API et dans le parcours de tous les écrans ;
  - parcours avec l'ancien bundle de `main` contre la nouvelle API (§6).
- **Non corrigé, documenté** : risque 9 du §4. La correction robuste (page de désinscription servie par le serveur) dépasse ce lot.

## 6. Recette de non-régression (lot 9)

**Données** : aucune sauvegarde de la prod n'existe sur le poste. J'ai donc utilisé un jeu fictif, versionné et déterministe (`scripts/nonreg/generate_dataset.sql`, mot de passe et domaine fictifs) :
- **comptes** :
  - 768 étudiants, dont : 40 sans promotion, 70 sans référent, 30 désactivés, 5 anonymisés, 190 notés, une part en anglais ;
  - 13 conseillers, 3 admins ;
- **données** :
  - 26 promotions ;
  - 3 223 offres (équipe + 3 sources externes) ;
  - 7 006 candidatures avec leur historique, 2 400 candidatures via le jobboard ;
  - 306 CV avec un vrai PDF chacun ;
  - historique XP, demandes d'aide.

Base jetable `itic_cre_nonreg`, schéma de `main` (V50), migrée ensuite par la branche finale.

**Migrations V51 → V61** :
- **Durée** : 0,21 à 0,26 s pour les 11, sans erreur ni verrou notable. En prod, le service est arrêté pendant la migration (`systemctl restart`).
- **Données** : empreinte des tables existantes **identique** avant et après. 190 notes reprises sur 190, aucune offre de l'équipe sans date de publication.
- **Second passage** : base remise en V50 depuis la copie et migrée de nouveau, même résultat. Un redémarrage ne rejoue rien (« 63 migrations validées »).
- **Contrôle Flyway** : aucune migration déjà présente sur `main` n'est modifiée (V51 à V61 sont des ajouts) ; les sommes de contrôle de V1 à V50 sont validées au démarrage.

**Comparaison `main` ↔ branche finale, sur les mêmes données** :

| Parcours | Résultat |
|---|---|
| 207 lectures d'API (admin, conseiller, étudiant avec CV, étudiant vide, étudiant anglophone) | 189 identiques. 18 différentes, **toutes expliquées** : ajouts (code `VALIDE`, source JSearch), règle du lot 1 (contrat déclaré : listes de CV, compteurs, « à relancer »), bruit de mesure (connexions des scripts, identifiants tirés au hasard du brouillon de CV). Aucun champ supprimé, aucun code HTTP changé |
| 31 écritures (inscription avec e-mail, profil, candidature et statut, jobboard, dépôt et lecture du CV d'un étudiant vide, contrat, demande d'aide, export RGPD, commentaire et statut de CV, offre créée / modifiée / désactivée / réactivée, message, note, désactivation / réactivation avec e-mail, création de conseiller avec e-mail, ancien bouton de suppression, journal, déconnexion) | **31 / 31 identiques** (codes HTTP et e-mails) |
| Tous les écrans de la branche finale, 4 rôles + public, ordinateur et 390 px (100 écrans) | 90 sans erreur. Les 10 autres sont attendus ou déjà présents sur `main` (voir ci-dessous) ; aucune boucle de requêtes, aucun débordement à 390 px |
| L'**ancien front de `main`** contre la nouvelle API (41 écrans) | 37 sans erreur ; les 4 autres sont les mêmes problèmes déjà présents sur `main` |

Écarts déjà présents sur `main` (non causés par la pile, non corrigés) :
- `/advisors/all` répond 403 à un conseiller sur trois pages (le front l'appelle pour un filtre réservé à l'admin) ;
- la page « Offres externes » répond 500 sans identifiants France Travail (local seulement ; la prod les a) ;
- recherche d'offres par titre ou entreprise sans paramètre → 500 au lieu de 400.

**Interrupteurs** (`scripts/nonreg/switches_check.py`, boîte de capture locale) :
- **par défaut** : e-mail du soir parti (20) ; récapitulatif du lundi, alertes et Espace entreprise coupés (5/5) ;
- **allumés un par un** : récapitulatif (274 e-mails), alertes (25), Espace entreprise ouvert par l'admin (200).

**Bugs trouvés pendant la recette et corrigés** (chacun avec un test qui échouait avant) :
1. **Rattachement initial des offres jamais exécuté** : il passait avant la création des formations et se terminait sans rien faire (aucune trace). Il est maintenant lancé à la fin de l'initialisation des formations. Test `backfillRunsAfterProgramsOnce`.
2. **Rattachement initial trop lent** : plus de 100 s sans finir pour 3 223 offres (normalisation du texte refaite 39 fois, transaction énorme) → 14 s. Couvert par les tests d'alerte et de rattachement.
3. **« Étudiants à relancer » qui changeait d'une version à l'autre** (ex aequo sans départage) → tri stable par nom.
4. Les 6 bugs du §5 (liste vide, garde 4xx, page blanche, offre non réenregistrable, commentaire d'un auteur supprimé, bouton « Envoyer un message » d'un compte désactivé).
5. **Interrupteurs d'envoi non lus** depuis un `.env` importé comme fichier de propriétés.

### 6.4 Seconde passe sur une copie restaurée de la prod (17/11)
Une sauvegarde complète de la prod a été faite par l'utilisateur, **en lecture seule** (`pg_dump`, ni écriture, ni migration, ni redémarrage), copiée hors du dépôt et hors des dossiers synchronisés, puis restaurée dans des bases locales jetables. Aucune de ses données ne figure dans ce dépôt, dans les captures ou dans la PR. Seuls des constats agrégés sont notés ici. Les comptes de connexion de la recette ont reçu des adresses et un mot de passe fictifs, sur la copie seulement.
- **Restauration** : sans erreur.
- **Migrations V51 → V61** sur l'historique réel (V1 → V50, avec la `10.1` appliquée hors ordre) : 11 appliquées en ~0,2 s ; empreinte des données existantes **identique** avant et après.
- **Seeders** : à faire tourner avec `TEST_SEEDERS_ENABLED=false` et `BOOTSTRAP_ADMIN_ENABLED=false`, comme en prod. Avec le `.env` local, le démarrage crée 8 promotions de démonstration et un admin `admin@…` : c'est un effet du `.env` local, pas de la pile.
- **Rattachement initial des offres** : 4 à 5 min au volume réel (contre 14 s sur le jeu fictif). L'API répond en ~30 s, et les connexions restent rapides pendant le rattachement.
- **Comparaison `main` ↔ finale** : toutes les différences de lecture sont expliquées : code `VALIDE` (V55), ordre des statistiques de CV, départage des ex aequo, source JSearch ajoutée (coupée), connexions de la recette. 31/31 écritures identiques. Écrans : aucune erreur nouvelle (seul `/entreprise` en 404, fermé par défaut).
- **Constat nouveau** : plus de la moitié des étudiants actifs sont dans une promotion dont le nom n'est reconnu par aucune formation. Ils voient toutes les offres, comme avant, mais n'ont ni « Offres pour ma formation », ni alertes ou récapitulatif par formation, et n'apparaissent pas dans l'Espace entreprise. À relier à la main avant d'activer ces fonctions (§7.5).
- `scripts/nonreg/data_fingerprint.sql` corrigé : il plantait sur une version Flyway décimale (`10.1`).

**Pas vérifiable ici** :
- les quotas réels de France Travail et La Bonne Alternance ;
- la délivrabilité du SMTP de prod pour 274 e-mails d'un coup ;
- l'accès Internet au CRE (le domaine pointe vers une adresse interne).

## 7. Procédure du jour J

À suivre dans l'ordre, un jour où quelqu'un peut surveiller jusqu'au soir (l'e-mail du soir part à 18 h). Aucune étape n'est automatique : c'est toi qui fusionnes (« go merge »).

### 7.1 Sauvegarde de la base et test de restauration (15 min)
1. Sur le serveur : `pg_dump -Fc -d <base_prod> -f ~/itic-cre-avant-pile-$(date +%Y%m%d-%H%M).dump`.
2. Restauration d'essai dans une base de test du serveur : `createdb itic_cre_restore_test && pg_restore -d itic_cre_restore_test <fichier>`, puis comparer `SELECT count(*) FROM users;` et `SELECT count(*) FROM applications;` entre les deux bases. Supprimer ensuite la base de test.
3. Noter la version de `flyway_schema_history` (doit être **50**).

### 7.2 Fusion des PR (10 min)
- Fusionner dans l'ordre, en **merge commit** (pas de squash) :

  #71 → #82 → #83 → #84 → #85 → #86 → #87 → #88 → #89 → #90 → #91 → #92 → #93 → #94 → #95 → #96 → #97

  Après chaque fusion, la PR suivante reste fusionnable : elle est empilée.
- **Enchaîner les 17 fusions sans attendre** : `cd.yml` annule le déploiement en cours quand un nouveau push arrive (`cancel-in-progress`), donc **seul le dernier déploiement va au bout**, avec toute la pile. Les fusions doivent tenir dans les ~5 minutes que durent la compilation et les tests du pipeline.

### 7.3 Déploiement et migrations (10 min)
1. Suivre le dernier run de « Continuous Deployment » : tests Maven, Vitest, puis déploiement et contrôle de santé.
2. Vérifier les migrations sur le serveur :
   - `SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 12;` → **61 en tête**, toutes à `t` ;
   - journal : `journalctl -u itic-backend --since "15 min ago" | grep -E "Successfully applied|Formations :|ERROR"` → « Successfully applied 11 migrations » tout de suite, puis « Formations : N offre(s) en ligne rattachée(s) » **quelques minutes plus tard** (4 à 5 min au volume réel) : ne pas conclure à un échec avant.

### 7.4 Tests de fumée (10 minutes, juste après)
1. Ouvrir le CRE en navigation privée : la page de connexion s'affiche.
2. Se connecter en admin : le tableau de bord s'affiche (il peut mettre quelques secondes, comme avant).
3. Menu : « Conversations », « Demandes d'aide », « Espace entreprise », « Cartes » sont présents.
4. Étudiants : la liste s'affiche et la fiche d'un étudiant montre « Note de l'équipe ».
5. Validation CV : la liste s'affiche, et un CV s'ouvre.
6. Offres : la liste s'affiche, l'onglet « Formations » montre 39 lignes avec des offres actives.
7. Se connecter avec un compte étudiant **sans CV** : « Mon CV » s'affiche sans boucle (outils du navigateur : moins de 10 requêtes).
8. Même étudiant : la page Offres montre des offres, « Offres pour ma formation » ou « Toutes les offres ».
9. Envoyer un message à un étudiant de test depuis sa fiche : il apparaît dans « Conversations ».
10. Ouvrir `/entreprise` : « lien non valide » (fermé, c'est voulu).

**Si un point échoue** : voir 7.6.

### 7.5 Activer les fonctionnalités une par une (ordre conseillé)
Chaque variable se change dans le secret `BACKEND_ENV_CONTENT` (puis relance du déploiement par `workflow_dispatch`).

1. **Rien le premier jour** : laisser tourner, regarder « Conversations » et l'e-mail de 18 h (0 tant qu'aucune promotion n'est ciblée).
2. **Espace entreprise** (quand l'école l'annonce) :
   - **avant** : prévenir les étudiants qu'ils peuvent couper « Apparaître dans l'Espace entreprise », et vérifier l'accès Internet au CRE ;
   - **afficher** (lot 10) : `APP_COMPANY_SPACE_ENABLED=true` (menu, vitrine publique, back-office pour les conseillers) ;
   - **ouvrir** : admin → Espace entreprise → Textes et accès ;
   - **regarder ensuite** : les statistiques et l'onglet « Demandes ».
3. **Récapitulatif du lundi** :
   - **activer** : `APP_MAILING_WEEKLY_DIGEST_ENABLED=true` un mardi ;
   - **regarder le lundi suivant** : le nombre d'e-mails dans le journal (« Récapitulatif »), les désinscriptions, le SMTP.
4. **Alertes instantanées** :
   - **activer** : `APP_MAILING_INSTANT_OFFERS_ENABLED=true` ;
   - **avant** : vérifier l'onglet Formations (rattachements corrects) et couper les formations non voulues ;
   - **avant aussi** : relier à la main (onglet Formations, promotions choisies à la main) les promotions dont le nom n'est reconnu par aucune formation. Sur la copie de prod, **plus de la moitié des étudiants actifs** n'avaient aucune formation reconnue : ils voient toutes les offres, comme avant, mais ne reçoivent ni alerte ni récapitulatif par formation et n'apparaissent pas dans l'Espace entreprise ;
   - **regarder ensuite** : le « Journal des alertes » (en échec, reportés au soir).
5. **JSearch** (si une clé est achetée) : `JOBBOARD_JSEARCH_ENABLED=true` et la clé.

### 7.6 Retour arrière
**Quand** :
- une erreur 500 générale ;
- connexion impossible ;
- boucle de requêtes ;
- données visiblement fausses.

Pour un e-mail en trop, couper d'abord la variable : c'est plus rapide qu'un retour arrière.
1. **Code** :
   - le pipeline restaure déjà le jar précédent si le contrôle de santé échoue ;
   - sinon, sur le serveur : remettre le jar sauvegardé (`/home/github-runner/itic-cre-backups/app-<date>.jar.bak`) et le front (`frontend-previous`), puis `sudo systemctl restart itic-backend nginx` ;
   - côté GitHub : faire un « Revert » de la fusion de #97 … #71. **Ne jamais force-pusher `main`.**
2. **Base, sans restauration** (cas normal) : passer `scripts/rollback/avant_retour_arriere.sql` **avant** de redémarrer l'ancien jar. Il remet le statut « Validé » lisible, met hors ligne les brouillons d'offres et recopie les notes en étoiles. Les tables ajoutées restent : l'ancien code les ignore (testé : l'ancien code démarre sur une base V61, « 63 migrations validées »).
3. **Restauration complète** (seulement si des données sont abîmées) : `pg_restore` de la sauvegarde du 7.1. On perd tout ce qui a été saisi depuis le déploiement.

## 8. Comptes : suppression définitive (PR #95)

- **Qui** : un admin, depuis le back-office :
  - fiche d'un étudiant → « Supprimer définitivement » ;
  - Conseillers / Administrateurs → 🗑 sur la ligne.
- **Confirmation** : retaper l'adresse e-mail du compte.
- **Garde-fous** : jamais son propre compte ; jamais le **dernier admin actif**.
- **Étudiant** : son compte, son CV et ses fichiers, ses candidatures (et leur historique), sa messagerie, ses notes, ses alertes et ses demandes d'entreprises sont effacés (droit à l'effacement).
- **Conseiller ou admin** : ses offres, articles, commentaires de CV, notes et messages restent, signés « Compte supprimé ». Ses étudiants n'ont plus de référent.
- **Journal d'audit** : « Compte supprimé définitivement (rôle) », avec l'auteur de la suppression et la date. Le nom et l'adresse du compte supprimé sont retirés des entrées existantes du journal.
- **Nettoyer les comptes admin en trop**, en prod, sans script :
  1. se connecter avec l'admin à garder ;
  2. au besoin, créer un nouvel admin (« Créer un administrateur », plafond `ADMIN_MAX_ACTIVE`) ;
  3. supprimer les autres un par un (🗑, adresse à retaper). Le dernier admin actif ne peut pas être supprimé.
- **« Entreprise »** : il n'existe pas de compte entreprise dans le CRE (l'Espace entreprise est public, sans compte) ; rien à supprimer de ce côté.

## 9. Lot 10 : adresse, fin des demandes d'aide, Espace entreprise masqué, types de contrat, plafond à 4

Une seule PR, **3 migrations** (V62 adresse, V63 types de contrat, V64 demandes d'aide en attente reprises dans la messagerie), aucune donnée existante supprimée. Règles : `docs/REGLES_METIER.md` §24.

### 9.1 Ce qui change dès le déploiement
- **Inscription** : adresse postale obligatoire (rue, code postal, ville ; pas de « Complément »). Les étudiants déjà inscrits voient le bandeau « Complète ton adresse » ; rien n'est bloqué.
- **Demandes d'aide** : menu, compteur et bouton flottant retirés ; création refusée (410) ; données gardées. Anciennes adresses → messagerie. **V64** reprend chaque demande encore en attente en message de l'étudiant dans Conversations : fil non lu, date d'origine, mention « Ancienne demande d'aide », **aucun e-mail de rappel**. La demande passe en `TRANSFERRED`.
- **Espace entreprise masqué** : plus aucun menu ; vitrine publique « Page non disponible » (404 côté serveur) ; back-office ouvert aux admins seulement, par `/supervisor/espace-entreprise` (bandeau « masqué ») ; un conseiller reçoit 403 et **ne peut plus modifier une formation** tant que l'espace est masqué (les admins le peuvent). La liste des formations reste lisible par tous (filtres, carte, offres) et les formations continuent de servir en coulisses.
- **Types de contrat** : « Job Etudiant » (créé à la main en octobre) devient « Job étudiant », même identifiant ; aucun autre type touché.
- **Plafond d'admins** : 4 par défaut (au lieu de 3).

### 9.2 Variables
| Variable | Défaut | Rôle |
|---|---|---|
| `APP_COMPANY_SPACE_ENABLED` | `false` | Espace entreprise affiché (`true`) ou masqué (`false`) |
| `ADMIN_MAX_ACTIVE` | `4` | Plafond d'admins actifs. Si la ligne existe dans le secret avec une valeur plus basse, c'est elle qui compte |

Le `.env` du serveur est **réécrit à chaque déploiement** depuis le secret `BACKEND_ENV_CONTENT` (`cd.yml`). Une variable se change donc dans ce secret ; une modification faite à la main sur le serveur disparaît au déploiement suivant.

### 9.3 Procédure (Samuel lance chaque script lui-même, dans Git Bash)
1. **Sauvegarde** : `bash scripts/prod/sauvegarde_prod.sh` (lecture seule ; fichier daté hors dépôt, contrôles à côté).
   - **Répétition des migrations** (assistant, en local) : base jetable **en SQL_ASCII comme la prod** (`CREATE DATABASE … ENCODING 'SQL_ASCII' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`), avec le schéma de cette sauvegarde (`pg_restore -s`) plus les seules tables de référence (`contract_types`, `flyway_schema_history`) ; puis le jar construit comme la CI, lancé dessus. Flyway doit arriver à 64. Aucune donnée personnelle n'est chargée.
2. **Vérification** : `ssh root@10.190.0.16 'bash -s' < scripts/prod/verif_admins.sh` (lecture seule). Elle affiche :
   - la ligne `ADMIN_MAX_ACTIVE` ;
   - les comptes admin ;
   - les **demandes d'aide** par statut et celles en attente, avec leur date : V64 les reprendra dans Conversations. Noter leur nombre, qui doit se retrouver en `TRANSFERRED` après le déploiement ;
   - la CSP de Nginx. Si elle existe, ajouter `https://geo.api.gouv.fr` à `connect-src` ; sinon, l'aide au code postal se tait et la ville se tape à la main.
3. **« Go merge »** : fusion par la file de fusion (merge commit), déploiement automatique par `cd.yml`, **Flyway passe à 64**.
4. **Plafond** : si `ADMIN_MAX_ACTIVE` est présent avec une valeur inférieure à 4, il y a deux étapes.
   - Mettre `ADMIN_MAX_ACTIVE=4` dans le secret `BACKEND_ENV_CONTENT`, ou retirer la ligne. C'est la correction durable.
   - Pour l'appliquer sans attendre de redéploiement : après un « go », lancer `bash scripts/prod/plafond_admins.sh`. Il demande « tape OUI », fait une copie datée du `.env`, change la ligne, redémarre le service et vérifie. Le retour arrière est décrit en tête du script.
   - Si la ligne est absente, rien à faire : le défaut du code (4) suffit.
5. **Contrôle** : `ssh root@10.190.0.16 'bash -s' < scripts/prod/verif_deploiement.sh` (Flyway 64, 0 échec, 0 ERROR), puis `verif_admins.sh` (demandes : 0 en attente, autant de `TRANSFERRED` qu'avant). Contrôles à la main :
   - inscription avec adresse (puis supprimer le compte de test) ;
   - menus sans « Demandes d'aide » ni « Espace entreprise » ;
   - `/entreprise` → « Page non disponible » ;
   - « Publier une offre » → « Job étudiant » dans la liste ;
   - Conversations → filtre « Non lus » : les anciennes demandes d'aide y sont, à traiter.

### 9.4 Retour arrière
« Revert » de la fusion sur GitHub (nouveau déploiement). V62, V63 et V64 n'ont rien supprimé : l'ancien code ignore les colonnes d'adresse et de transfert, et « Job étudiant » reste un type ordinaire. **Avant que l'ancien code ne tourne** : passer `scripts/rollback/avant_retour_arriere_lot10.sql`. L'ancien code ne connaît pas le statut `TRANSFERRED` : sans ce script, l'export RGPD d'un étudiant concerné et la liste « Demandes d'aide » répondent 500. Le script remet ces demandes « en attente » ; les messages créés restent dans Conversations.

### 9.5 Incident du 19/11 : première V63 en échec, retour arrière (#99)
- **Ce qui s'est passé** : #98 fusionnée à 10 h 31, puis le serveur a redémarré en boucle (25 redémarrages). V62 est passée ; V63 échouait à chaque démarrage : `SQL State 23505`, clé dupliquée sur la contrainte unique `contract_types_label_key`, ligne 30 (dernier `INSERT 'Job étudiant'`). PostgreSQL annulait V63 à chaque fois : Flyway restait à 62 sans échec enregistré. V64 n'a jamais tourné.
- **Cause** : la base de prod est en **SQL_ASCII**. `translate(lower(label), 'éèêë', 'eeee')` y travaille octet par octet, et « é » fait deux octets : après le renommage de « Job Etudiant » en « Job étudiant », la garde du dernier `INSERT` ne reconnaissait plus ce libellé et tentait de l'insérer une seconde fois. Les répétitions avaient été faites sur des bases en UTF8, où tout passait.
- **Retour arrière** : #99 (annulation de la fusion), déployée avec succès ; le code est revenu à `2239a1a`. V62 reste appliquée : l'ancien code ignore ces colonnes. Aucune donnée n'a été écrite par V63 ni V64 : `avant_retour_arriere_lot10.sql` n'était pas nécessaire.
- **Correction** : V63 réécrite (jamais appliquée nulle part en prod) : variantes écrites en toutes lettres, égalité exacte, libellé exact vérifié avant chaque `INSERT`. Reproduite puis validée avec le vrai jar sur une copie SQL_ASCII du schéma de prod, et sur une copie SQL_ASCII de données fictives (Flyway 64, 55 demandes transférées, démarrage 31 s, 0 ERROR).
- **Au prochain déploiement** : Flyway applique V63 et V64 (V62 est déjà là), puis passe à 64.

### 9.6 Déploiement : version de secours et rechargement du front (ajoutés à #100)
- **Version de secours toujours gardée** (`scripts/deploy/deploy_native.sh`, appelé par `cd.yml`). Le 19/11, le pipeline ne trouvait pas le jar en service (« Aucun jar actuellement en service ») : `actions/checkout` vide le dossier de travail du runner à chaque déploiement. Désormais :
  - après chaque déploiement réussi, le jar est copié dans `/home/github-runner/itic-cre-backups/last-good.jar` (hors du dossier de travail), avec `last-good.txt` (commit, date) ;
  - au **premier** passage du nouveau pipeline, `last-good.jar` n'existe pas encore : `cd.yml` télécharge le jar du dernier déploiement réussi (artefact GitHub `backend-jar`, gardé 90 jours) ;
  - contrôle de santé pendant **120 s** (un démarrage normal prend moins d'une minute), interrompu plus tôt si le service redémarre en boucle (2 redémarrages automatiques) ou passe en échec ;
  - en cas d'échec : le jar et le front précédents sont remis, le service redémarre et il est contrôlé à son tour. Le job échoue quand même, ce qui déclenche l'alerte Discord : la nouvelle version n'est **pas** en ligne.
  - **Limite** : une migration Flyway réussie reste en base, rien ne l'annule. L'ancien jar l'ignore (Flyway laisse de côté les migrations plus récentes que les siennes). Les migrations restent donc à répéter avant (§9.3).
  - **Testé sans serveur** à chaque pipeline (`scripts/deploy/test_deploy_native.sh`, job build) et à la main : 9 scénarios, 31 contrôles (succès, démarrage lent, boucle de redémarrage, service muet, premier passage avec l'artefact précédent, jar en service détecté, aucune version de secours, secours en échec lui aussi, ménage des copies). Ces tests ont trouvé un défaut corrigé avant toute mise en ligne : le ménage des copies faisait échouer un déploiement réussi.
- **Rechargement automatique du front** (`src/pwa/versionWatcher.ts`). Le 19/11, un poste est resté sur l'ancienne version, servie par le service worker depuis son cache. Désormais :
  - chaque build publie `/version.json` (commit du build), jamais mis en cache ;
  - l'onglet le relit toutes les 5 minutes, au retour sur l'onglet, et quand un morceau de l'application ne se charge plus ;
  - s'il diffère (nouvelle version, ou version remise après un retour arrière), il met à jour le service worker puis recharge la page ;
  - **jamais pendant une saisie** : si un champ est actif, il attend qu'on le quitte ;
  - si la page rechargée est toujours l'ancienne, il désinscrit le service worker, vide ses caches et recharge une dernière fois, sans boucle.
  - Recette dans un vrai navigateur (Edge, `vite preview`, service worker actif) : version B publiée → page rechargée d'elle-même en 1,8 s ; rechargement manuel → toujours B ; version C publiée pendant une saisie → pas de rechargement en 6 s, texte intact, puis rechargée dès le champ quitté.
- **Le jour du déploiement de #100** : les postes ouverts sur l'ancienne version n'ont pas encore ce mécanisme. Ils prennent la nouvelle version au prochain contrôle de leur service worker (navigation, ou toutes les 15 min dans l'ancien code). Les déploiements suivants seront pris en compte d'eux-mêmes.

## Annexes : scripts (versionnés)

| Script | Rôle |
|---|---|
| `scripts/nonreg/generate_dataset.sql` | jeu de données fictif et volumineux (refuse toute base dont le nom ne contient pas « nonreg ») |
| `scripts/nonreg/place_cv_files.py` | pose un vrai PDF pour chaque CV généré |
| `scripts/nonreg/data_fingerprint.sql` | empreinte des données existantes, avant / après migration |
| `scripts/nonreg/api_snapshot.py` | photographie et compare toutes les lectures de l'API, par rôle |
| `scripts/nonreg/api_journeys.py` | rejoue et compare les écritures des parcours existants |
| `scripts/nonreg/ui_sweep.py` | passe sur chaque écran (ordinateur, 390 px, ancien bundle) |
| `scripts/nonreg/switches_check.py` | vérifie les envois selon les interrupteurs |
| `scripts/deploy/deploy_native.sh` | déploiement natif appelé par `cd.yml` : version de secours `last-good.jar`, contrôle de santé 120 s, retour automatique |
| `scripts/deploy/test_deploy_native.sh` | tests du script de déploiement sans serveur (job build de `cd.yml`, ou à la main) |
| `scripts/rollback/avant_retour_arriere.sql` | à passer avant un retour arrière du code |
| `scripts/rollback/avant_retour_arriere_lot10.sql` | lot 10 : à passer avant un retour arrière du lot 10 (statut `TRANSFERRED` inconnu de l'ancien code) |
| `scripts/prod/sauvegarde_prod.sh` | sauvegarde de la base de prod, lecture seule, copiée sur le poste (Samuel la lance) |
| `scripts/prod/verif_admins.sh` | lot 10, lecture seule : ADMIN_MAX_ACTIVE, comptes admin, demandes d'aide en attente, CSP |
| `scripts/prod/plafond_admins.sh` | lot 10, après « go » seulement : ADMIN_MAX_ACTIVE=4 sur le serveur, redémarrage, vérification |
| `scripts/prod/verif_deploiement.sh` | lecture seule : service, Flyway, journal du lancement en cours |
