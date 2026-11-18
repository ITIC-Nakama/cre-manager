# Sources d'offres externes : audit et élargissement (lot 5, 16/11/2026)

## 1. Audit des trois sources existantes (avant ce lot)

| | France Travail | La Bonne Alternance | Adzuna |
|---|---|---|---|
| Requêtes | OAuth2, puis `GET /offres/search` par code ROME × 5 natures de contrat (apprentissage E2, professionnalisation FS, stage par mot-clé, CDI, CDD) | Un seul `GET /job/v1/search` | `GET /jobs/fr/search/{page}` par catégorie × requêtes (stage, alternance, apprentissage, professionnalisation, CDI, mots-clés admin) |
| Filière | Codes ROME saisis par l'admin (vide = toutes professions) | Codes ROME saisis par l'admin (vide = toutes) | Mots-clés et catégories Adzuna saisis par l'admin |
| Zone | Régions saisies par l'admin (vide = toute la France) | Départements saisis par l'admin (vide = toute la France) | Lieu libre saisi par l'admin (vide = toute la France) |
| Pagination | Réelle, 150 par page, jusqu'à la limite de l'API (1 150 résultats par recherche) | **Aucune** : une seule réponse | Réelle, jusqu'à 1 000 résultats par recherche |
| Plafond | `JOBBOARD_SYNC_MAX_PER_PROVIDER` **par code ROME**, réparti 2/3 alternance + stage, 1/3 CDI + CDD | Même plafond, sur l'unique appel | Même plafond **par catégorie**, réparti 2/3 / 1/3 |
| Doublons | Par identifiant de la source (`source_id`) | Par `source_id` ; France Travail exclu côté API quand son fournisseur est actif ; Indeed toujours exclu | Par `source_id` |
| Télétravail | Pas de filtre dans l'API | Pas de filtre dans l'API | Pas de filtre fiable |

**Constats** :
- Les codes ROME dépendaient uniquement de la saisie de l'admin. Aucune source ne couvrait automatiquement **toutes les formations ITIC** (commerce, RH, immobilier, banque…).
- Sans zone saisie, la recherche portait sur toute la France.
- Une même annonce publiée par deux sources (ou déjà déposée par l'équipe) apparaissait deux fois.

## 2. Ce que change ce lot

- **Codes ROME des formations ITIC** : France Travail et La Bonne Alternance cherchent aussi les codes ROME de toutes les formations visibles de l'Espace entreprise. Ces codes sont préremplis au lot 4 (39 formations, 31 codes distincts) et modifiables dans Espace entreprise → Formations.
  - Réglage global « Ajouter les codes ROME des formations ITIC », activé par défaut et désactivable dans Offres → Offres externes.
  - La règle « non configuré = aucune restriction » est inchangée : si ni l'admin ni les formations n'ont de code, rien n'est filtré.
  - Effet sur le volume : le plafond `JOBBOARD_SYNC_MAX_PER_PROVIDER` s'applique **par code ROME** chez France Travail. Avec 31 codes, une synchronisation peut ramener jusqu'à 31 fois ce plafond et fait au moins 5 appels par code. Pour réduire, baissez ce plafond (Paramètres) ou décochez le réglage.
- **Île-de-France par défaut** : quand aucune zone n'est saisie pour une source, la recherche se fait en Île-de-France. Réglage global, activé par défaut.
  - France Travail : région 11.
  - La Bonne Alternance : départements 75, 77, 78, 91, 92, 93, 94 et 95.
  - Adzuna : `where=Ile-de-France`.
- **La Bonne Alternance par paquets** : un appel par paquet de 10 codes ROME. Chaque paquet a son propre plafond, comme chaque code ROME chez France Travail. L'API n'a toujours pas de pagination : c'est sa limite.
- **Dédoublonnage entre sources** : à chaque synchronisation, une offre dont l'entreprise, l'intitulé et la ville correspondent à une offre déjà active n'est pas recopiée. La comparaison se fait :
  - sans accents, majuscules, ponctuation ni code postal ;
  - en ramenant « Chargé(e) » à « Chargé ».
  - Exemples : « 75 - PARIS 11 » = « Paris » ; « Chargé(e) de recrutement H/F » = « chargé de recrutement h/f ».
  - Le journal de synchronisation indique le nombre de doublons par source.
- **Télétravail** : seul JSearch propose un filtre (`work_from_home`). France Travail, La Bonne Alternance et Adzuna n'en ont pas de fiable.

## 3. Agrégateur JSearch (RapidAPI), désactivé par défaut

- Nouveau fournisseur `JSEARCH`, conçu comme les autres (`AbstractJobProvider`). Il est découvert automatiquement et visible dans Offres → Offres externes.
- **Activation** : `JOBBOARD_JSEARCH_ENABLED=true`, plus une clé RapidAPI dans `JOBBOARD_JSEARCH_API_KEY`.
- **Plafond mensuel** : `JOBBOARD_JSEARCH_MONTHLY_CALL_CAP`, 100 par défaut. Chaque appel est compté en base (`provider_api_usage`). Au plafond, la synchronisation JSearch s'arrête jusqu'au mois suivant.
- **Recherches**, une page de 10 résultats par appel :
  - les mots-clés de l'admin, ou à défaut « alternance » et « stage » ;
  - suivis de la zone (Île-de-France par défaut) ;
  - plus une recherche « alternance télétravail » filtrée sur le télétravail ;
  - offres de la dernière semaine.
- **Éditeurs exclus** : `JOBBOARD_JSEARCH_EXCLUDED_PUBLISHERS`, « Indeed » par défaut, comme la décision déjà appliquée à La Bonne Alternance.
- **Coût / bénéfice**
  - **Coût** (tarifs relevés le 16/11/2026 sur des sites tiers, à vérifier sur la fiche RapidAPI avant de souscrire) :
    - palier gratuit annoncé entre 100 et 200 appels par mois ;
    - palier payant annoncé autour de 25 $ par mois pour 10 000 appels.
    - Avec 3 recherches par synchronisation et une synchronisation par jour, on compte environ 90 appels par mois : le palier gratuit suffit, d'où le plafond de 100 par défaut.
  - **Bénéfice** : JSearch reprend les offres indexées par Google for Jobs (sites d'entreprises, Welcome to the Jungle, LinkedIn, HelloWork…), c'est-à-dire des offres absentes de France Travail et de La Bonne Alternance. C'est aussi la seule source qui sait filtrer le télétravail.
  - **Limites**
    - Seulement 10 offres par appel : le palier gratuit donne quelques centaines d'offres par mois, à dédoublonner.
    - Les descriptions sont parfois tronquées.
    - Les conditions d'utilisation de RapidAPI et de l'éditeur s'appliquent.
  - **Recommandation** : l'essayer un mois au palier gratuit, puis comparer dans le panneau le nombre d'offres insérées et de doublons écartés avant d'envisager le palier payant.

## 4. Paragraphe pour Jules : Indeed, Welcome to the Jungle, JobTeaser

> Ces trois sites ne sont pas branchés directement, volontairement. **Indeed** n'ouvre plus son ancienne API de recherche d'offres aux nouveaux partenaires, et ses conditions interdisent la collecte automatique de ses pages. Nous n'aspirons pas les pages (« scraping ») : c'est contraire à leurs conditions et fragile. **Welcome to the Jungle** n'a pas d'API publique de recherche d'offres : ses API servent aux entreprises qui y publient (partenariat commercial). **JobTeaser** est une plateforme vendue aux écoles : l'accès aux offres passe par un contrat école, sans API publique. Si ITIC a déjà un compte école JobTeaser, il faudrait leur demander un flux ou une API partenaire : c'est la seule voie propre. En attendant, l'agrégateur JSearch (désactivé par défaut, environ 25 $ par mois au-delà du palier gratuit) remonte une partie des offres publiées sur Welcome to the Jungle et des sites d'entreprises via Google for Jobs. Indeed reste exclu par défaut, comme pour La Bonne Alternance.

## 5. Variables

| Variable | Défaut | Rôle |
|---|---|---|
| `JOBBOARD_JSEARCH_ENABLED` | `false` | Active JSearch (il faut aussi une clé) |
| `JOBBOARD_JSEARCH_API_KEY` | vide | Clé RapidAPI (secret, jamais dans le dépôt) |
| `JOBBOARD_JSEARCH_MONTHLY_CALL_CAP` | `100` | Plafond d'appels par mois |
| `JOBBOARD_JSEARCH_EXCLUDED_PUBLISHERS` | `Indeed` | Éditeurs écartés (séparés par des virgules) |

Les deux réglages d'élargissement se règlent dans Offres → Offres externes (base de données). Ils n'ont pas de variable d'environnement.
