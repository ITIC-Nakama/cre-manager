# Stratégie de synchronisation — Jobboard externe

Ce document explique comment chaque source externe (France Travail, Adzuna, La Bonne Alternance)
est interrogée pour garantir une couverture correcte des 4 types de contrat qui intéressent ITIC
(CDI, CDD, Alternance, Stage), et pourquoi le design a cette forme précise. Contrairement à
[TESTS_JOBBOARD_EXTERNE.md](./TESTS_JOBBOARD_EXTERNE.md) (qui documente les tests), ce fichier
documente le **pourquoi architectural** — utile avant de toucher à `AdzunaProvider`,
`FranceTravailProvider` ou `AbstractJobProvider.resolveContractType()`.

---

## Le problème de départ

Aucune des 3 APIs externes n'a de vraie classification structurée pour les 4 types de contrat qui
intéressent ITIC. Deux limitations différentes, découvertes et vérifiées en direct :

1. **Le "stage" n'existe nulle part comme code structuré.** Légalement, un stage n'est pas un
   contrat de travail en France (c'est une convention de stage), donc aucune des 3 APIs ne le
   modélise comme tel. Un vrai stage remonte sous des codes différents selon l'API — jamais un
   code dédié.
2. **L'ancienne documentation de crédentials contenait des valeurs fausses**, jamais vérifiées
   contre les vraies APIs : `natureContrat=FS` était censé vouloir dire "stage" côté France
   Travail — en réalité `FS` = "Contrat de professionnalisation" (confirmé via
   `/v2/referentiel/naturesContrats`). `contract_type=internship` était censé exister côté
   Adzuna — en réalité ce paramètre n'existe pas du tout (HTTP 400 confirmé en direct).

**Conséquence concrète mesurée** : sans détection par titre, un vrai stage titré
"STAGE — Développeur Full Stack" ressort de France Travail avec `typeContrat: CDI`. Une vraie
alternance titrée "Alternance — Chargé(e) de mission" ressort avec `typeContrat: CDD`. Aucun
signal fiable dans les champs structurés, seul le **titre de l'offre** dit la vérité de façon
cohérente.

---

## Ce qui est réellement structuré, par source (vérifié en direct, pas supposé)

| Type de contrat | France Travail | Adzuna | La Bonne Alternance |
|---|---|---|---|
| CDI | ✅ `typeContrat=CDI` — filtre fiable, vérifié (260 résultats, tous CDI) | ✅ `permanent=1` — filtre fiable, vérifié (3155 résultats, tous `permanent`) | n/a (jamais de CDI sur cette source) |
| CDD | ✅ `typeContrat=CDD` — filtre fiable, vérifié (45 résultats, tous CDD) | ❌ Aucun filtre fiable — `permanent=0` ne filtre rien (12 704 résultats non filtrés, vérifié) | n/a |
| Alternance | ✅ `natureContrat=E2` — filtre fiable (déjà en place avant cette session) | ❌ Aucun paramètre — texte uniquement | ✅ 100% structuré (`contract.type`, seule nature possible sur cette source) |
| Stage | ❌ Aucun code — `motsCles=stage` (texte) | ❌ Aucun paramètre — texte uniquement (`what=stage`) | n'existe pas sur cette source |

**Piège à connaître** : `typeContratLibelle` (France Travail) et `contract_type` (Adzuna, champ de
réponse) décrivent la **durée** du contrat (CDI/CDD), pas sa **nature** (stage/alternance). Une
alternance ou un stage porte quand même un `typeContrat`/`contract_type` de CDI ou CDD en dessous —
ces deux dimensions sont indépendantes. D'où la détection par titre dans `mapOffer()`/`mapJob()`,
qui **prend toujours la priorité** sur le libellé structuré quand le titre contient
"stage"/"stagiaire" ou "alternance"/"apprenti".

---

## Les buckets garantis, par source

### France Travail (`FranceTravailProvider.SEARCH_BUCKETS`)

Pour **chaque code ROME configuré** (ou une seule fois si aucun ROME n'est configuré), 4
recherches distinctes sont faites, chacune avec sa part garantie du quota — alternance et stage
en tête de liste et marqués `priority=true` (2/3 du quota, voir formule plus bas) :

```java
new SearchBucket("E2", null, null, true),     // natureContrat=E2 (structuré, alternance) — prioritaire
new SearchBucket(null, null, "stage", true),  // motsCles=stage (texte, aucune alternative) — prioritaire
new SearchBucket(null, "CDI", null, false),   // typeContrat=CDI (structuré)
new SearchBucket(null, "CDD", null, false)    // typeContrat=CDD (structuré)
```

### Adzuna (`AdzunaProvider.fetchOffers`)

Pas de notion de ROME côté Adzuna — le ciblage par domaine se fait via le champ **Catégorie**
(`category`, ex: `it-jobs`), appliqué **à toutes** les recherches ci-dessous sans exception :

- `"stage"` — toujours ajouté (sauf doublon exact déjà présent dans les mots-clés), **prioritaire**
- `"alternance"` — toujours ajouté (sauf doublon exact déjà présent dans les mots-clés), **prioritaire**
- `permanent=1` — toujours ajouté, garantit le CDI, non prioritaire
- Mots-clés configurés par l'admin (ou une recherche non filtrée si rien n'est configuré), non prioritaires

**Le CDD n'a pas de bucket dédié** : aucun filtre fiable n'existe (`permanent=0` ne fonctionne
pas). Il reste couvert par la recherche par défaut/mots-clés, qui le représente déjà naturellement
bien (confirmé : ~35% des résultats bruts sans aucun filtre).

### La Bonne Alternance

Inchangé — une recherche par code ROME, aucun bucket supplémentaire nécessaire. Cette source ne
retourne structurellement que de l'alternance (`contract.type` ∈ `{Apprentissage,
Professionnalisation}`, jamais autre chose, vérifié en direct sur données réelles), donc rien à
garantir en plus.

---

## Limites connues (à garder en tête, pas des bugs)

1. **Plus de codes ROME/catégories configurés = plus d'appels API par synchronisation.** Chaque
   bucket/requête = une recherche paginée à part (jusqu'à 20 pages pour Adzuna, jusqu'à ~8 pages
   pour France Travail), répétée pour chaque combinaison. Pertinent pour Adzuna dont le tier
   gratuit a un quota d'appels mensuel.
2. **"stage"/"alternance" (Adzuna) n'ont aucun ciblage métier propre** — sans `category` configurée,
   ces deux buckets remontent du bruit hors ITIC (ex: alternance vendeur, alternance restauration).
   La `category` (`it-jobs`, `hr-jobs`, etc.) est le seul levier pour limiter ça côté Adzuna.
3. **Le CDD Adzuna reste non garanti**, par choix contraint (pas de fix possible côté API).
4. **La détection stage/alternance par titre n'est pas infaillible** — elle dépend du texte exact
   du titre de l'offre. Fiable dans la quasi-totalité des cas observés (les employeurs indiquent
   quasi systématiquement "Stage"/"Alternance" dans le titre), mais pas garanti à 100%.

---

## Calcul du quota (`maxOffers`, config `JOBBOARD_SYNC_MAX_PER_PROVIDER`)

### Ce que représente `maxOffers`

`maxOffers` est un **quota par combinaison** pour France Travail et Adzuna :
- Côté France Travail : le quota que reçoit **chaque code ROME configuré** (une recherche par
  code ROME × bucket de contrat).
- Côté Adzuna : le quota que reçoit **chaque catégorie sélectionnée**.

Le total réel récupéré grandit donc avec le nombre de codes ROME / catégories configurés
(`maxOffers × nombre de combinaisons`).

**La Bonne Alternance fait exception** : `LaBonneAlternanceProvider` envoie tous les codes ROME
configurés dans un seul appel API (`romes=M1805,M1810,...`), pas une recherche par code ROME —
`maxOffers` y agit donc comme un plafond simple sur cette unique recherche, sans multiplication.
Cette source n'a pas de répartition prioritaire par bucket non plus (elle ne retourne
structurellement que de l'alternance, voir *Les buckets garantis, par source*).

### La répartition prioritaire (2/3 / 1/3) à l'intérieur de chaque combinaison

Alternance et stage sont prioritaires à l'intérieur de chaque combinaison : ils se partagent 2/3
du quota de cette combinaison à parts égales, CDI/CDD (ou CDI + mots-clés côté Adzuna) se
partagent le tiers restant.

Formule pour France Travail :

```
Pour chaque code ROME, indépendamment des autres :
  poolPrioritaire = maxOffers × 2 / 3             (alternance + stage, à parts égales)
  poolNormal      = maxOffers − poolPrioritaire    (CDI + CDD, à parts égales)
  quota bucket prioritaire (alternance, stage) = poolPrioritaire ÷ 2
  quota bucket normal (CDI, CDD)               = poolNormal ÷ 2
```

Formule pour Adzuna (identique, en remplaçant "code ROME" par "catégorie", et "bucket" par
"requête" — stage/alternance/CDI garantis + mots-clés configurés) :

```
Pour chaque catégorie, indépendamment des autres :
  poolPrioritaire = maxOffers × 2 / 3    (requêtes "stage" + "alternance", à parts égales)
  poolNormal      = maxOffers − poolPrioritaire
  quota requête prioritaire = poolPrioritaire ÷ 2
  quota requête normale     = poolNormal ÷ (nombre de requêtes normales : CDI + mots-clés configurés)
```

Les buckets/requêtes prioritaires passent en premier dans l'ordre d'itération (à l'intérieur d'une
même combinaison), sans effet sur la répartition elle-même (chaque bucket a son plafond scellé,
indépendant de l'ordre) — utile surtout si la synchronisation est interrompue avant la fin
(timeout, erreur) : les données prioritaires ont alors déjà été récupérées.

### Le plafond de sécurité global (`totalCeiling`)

`totalCeiling = maxOffers × nombre de combinaisons` est le plafond réel de toute la
synchronisation (tous codes ROME/catégories confondus) — c'est cette valeur, pas `maxOffers` seul,
qui arrête la boucle globale (`offers.size() >= totalCeiling`).

### Deux garde-fous distincts, à ne pas confondre

1. **Entre les buckets/requêtes d'une même combinaison** (ex: les 4 buckets d'un même code ROME) :
   chacun a son propre plafond fixe (`priorityBucketQuota`/`normalBucketQuota`), indépendant de
   l'ordre d'exécution. CDI ne peut jamais consommer la part d'Alternance — le code s'arrête pile
   au quota (`addedForThisBucket >= perBucketQuota`, vérifié à chaque page ET à chaque offre
   ajoutée), quel que soit le volume réel disponible côté API.
2. **Entre plusieurs combinaisons (codes ROME ou catégories)** : chaque combinaison a son propre
   quota complet et indépendant — un code ROME "riche" en résultats ne peut rien prendre au quota
   d'un autre code ROME. Le seul plafond partagé entre combinaisons est `totalCeiling`.

### Exemple chiffré complet

`maxOffers=1000`, 3 codes ROME configurés pour France Travail :

```
poolPrioritaire = 1000 × 2/3 = 666  →  quota Alternance = quota Stage = 333
poolNormal      = 1000 − 666 = 334  →  quota CDI = quota CDD = 167
```

| | Alternance | Stage | CDI | CDD | Total par code ROME |
|---|---|---|---|---|---|
| **Quota** | 333 | 333 | 167 | 167 | **1000** |

Ce même jeu de quotas (333/333/167/167) s'applique identiquement aux 3 codes ROME, chacun
indépendamment des autres, quel que soit le volume réel d'offres disponible pour chacun (le
plafond par bucket ne dépend jamais du volume réel trouvé).

- **Total maximal théorique** : 1000 × 3 = **3000** offres pour France Travail.
- **Plafond de sécurité** (`totalCeiling`) : 1000 × 3 = 3000.

Avec `maxOffers=10000` (valeur en prod) et 3 codes ROME sélectionnés : total théorique = 30 000
pour France Travail seul — la limite pratique réelle reste la pagination de chaque API (~1150
résultats/recherche côté France Travail, ~1000 côté Adzuna).

### Coût en appels API

Sélectionner plus de codes ROME (ou de catégories Adzuna) augmente proportionnellement le nombre
d'appels API effectués à chaque synchronisation (buckets/requêtes × pages de pagination ×
combinaisons). Pertinent pour Adzuna, dont le tier gratuit a un quota d'appels mensuel. C'est le
nombre de codes ROME/catégories sélectionnés, pas `maxOffers` seul, qui détermine le volume réel
d'appels et d'offres importées.

---

## Sélection des critères : référentiel réel, défaut "Toutes les offres"

`ExternalSourceConfigSeeder` ne pose aucune curation de codes ROME/catégories en dur. Chaque ligne
`external_source_configs` créée sur une base fraîche est activée, sans restriction ("Toutes les
offres"). ITIC Paris ("Institut des Techniques Informatiques et Commerciales") couvre un pôle IT
(Développement, Data/IA, Cybersécurité, Réseaux/Infra, Product/Design — voir `SectorSeeder`) et un
pôle business school (Marketing Digital, Commerce, Comptabilité, RH — voir `PromotionSeeder`) :
une curation figée dans le code serait nécessairement incomplète et invisible pour un admin, qui
ne pourrait ni voir ce qui est disponible au-delà, ni la corriger sans redéploiement.

Le panneau admin (`ExternalSyncPage` / `ExternalSourceDetail.tsx`) expose le référentiel complet de
chaque source via `MultiSelectReference.tsx` (dropdown avec recherche texte) ; l'option "Toutes les
offres" reste active tant qu'un admin n'a rien sélectionné explicitement. Le choix des filières
appartient entièrement à l'admin, pas à une présélection codée en dur.

| Source | Référentiel exposé | Endpoint backend | Taille |
|---|---|---|---|
| `FRANCE_TRAVAIL` / `BONNE_ALTERNANCE` | Codes ROME (France Travail) | `GET /jobboard/admin/external/reference/rome-codes` | **1911** entrées (`/v2/referentiel/metiers`, plus granulaire que les ~500 fiches ROME classiques) |
| `ADZUNA` | Catégories Adzuna | `GET /jobboard/admin/external/reference/adzuna-categories` | 30 entrées (`/v1/api/jobs/fr/categories`) |

Le référentiel ROME est trop volumineux pour être figé dans ce document (il évoluerait et le doc
deviendrait obsolète) — la liste à jour se consulte en direct via l'endpoint ci-dessus (ou dans le
select du panneau admin). Les 30 catégories Adzuna, elles, tiennent dans un tableau :

| Tag | Libellé (FR) | Tag | Libellé (FR) |
|---|---|---|---|
| `it-jobs` | Emplois Informatique | `legal-jobs` | Emplois Droit |
| `accounting-finance-jobs` | Emplois Comptabilité et Finance | `creative-design-jobs` | Emplois Création et Design |
| `sales-jobs` | Emplois Vente | `graduate-jobs` | Emplois Diplômés |
| `customer-services-jobs` | Emplois Services client | `retail-jobs` | Emplois Commerce détail |
| `engineering-jobs` | Emplois Ingénierie | `consultancy-jobs` | Emplois Consultants |
| `hr-jobs` | Emplois RH et Recrutement | `manufacturing-jobs` | Emplois Fabrication |
| `healthcare-nursing-jobs` | Emplois Soins de santé et infirmiers | `scientific-qa-jobs` | Emplois Scientifiques et AQ |
| `hospitality-catering-jobs` | Emplois Hospitalité et Restauration | `social-work-jobs` | Emplois Travail social |
| `pr-advertising-marketing-jobs` | Emplois RP, Publicité et Marketing | `travel-jobs` | Emplois Voyages |
| `logistics-warehouse-jobs` | Emplois Distribution et Entrepôts | `energy-oil-gas-jobs` | Emplois Énergie, pétrole et gaz |
| `teaching-jobs` | Emplois Enseignement | `property-jobs` | Emplois Immobilier |
| `trade-construction-jobs` | Emplois Industrie et Construction | `charity-voluntary-jobs` | Emplois Caritatif et Volontariat |
| `admin-jobs` | Emplois Administration | `domestic-help-cleaning-jobs` | Emploi Aide ménagère et Nettoyage |
| `maintenance-jobs` | Emplois Maintenance | `part-time-jobs` | Emplois Temps partiel |
| `other-general-jobs` | Emplois Autres/Général | | |

### Composants ajoutés

- **Backend** — `FranceTravailProvider.fetchRomeReferential()` (fetch + cache mémoire, ne se
  recharge qu'au redémarrage) et `AdzunaProvider.getReferenceCategories()` (liste en dur, évite un
  appel live à chaque ouverture du panneau — consomme le quota Adzuna pour rien sinon) ;
  `ReferenceOptionDTO(value, label)` ; deux `GET` dans `JobboardAdminController`.
- **Frontend** — `MultiSelectReference.tsx` (`components/basics/`) : dropdown personnalisé (bouton
  déclencheur + panneau porté en portail, même mécanique de positionnement que `CustomSelect.tsx`)
  avec filtre texte (indispensable à l'échelle de 1911 entrées) et lignes cochables au clic simple
  (pas de `<select multiple>` natif, qui exigerait Ctrl/Cmd+clic). Un bouton "Toutes les offres"
  en tête du panneau vide la sélection. Chips retirables affichées sous le bouton déclencheur, même
  fermé, pour rester lisible sans avoir à rouvrir le panneau. `useRomeCodesReference()` /
  `useAdzunaCategoriesReference()` (TanStack Query, `staleTime` 1h — référentiels quasi statiques).

### `mots-clés`

"Mots-clés" (Adzuna) est un affinage optionnel appliqué en plus d'une (ou plusieurs) catégorie(s)
— ex: restreindre `it-jobs` à "développeur junior". Ce n'est pas le mécanisme de scoping
principal (`category` s'en charge, de façon structurée) ; aucune valeur par défaut n'y est posée.

### Adzuna : `category` est une liste, pas une valeur unique

Le champ `category` d'Adzuna n'a pas d'équivalent multi-valeurs côté API (une recherche = une
catégorie), mais couvrir plusieurs filières avec un seul tag en exclurait toutes les autres.
`AdzunaProvider.fetchOffers()` traite donc `category` en CSV et boucle dessus comme
`FranceTravailProvider` boucle sur les codes ROME (dimension `categoryLoop`, imbriquée avec
`queryLoop` ; voir *Calcul du quota* plus haut pour la répartition). Vide = aucune restriction.

**`seedIfMissing` ne touche pas une ligne déjà existante** (même logique que pour
`JOBBOARD_SYNC_MAX_PER_PROVIDER`) — sur une base où `external_source_configs` contient déjà des
lignes (même vides), le seeder ne les modifie pas ; elles se corrigent depuis le panneau admin lui-même.

---

## Statistiques par type de contrat

`GET /jobboard/admin/external/stats` renvoie, pour chaque source, une répartition des offres
actives par type de contrat (`offersByContractType`, `JobOfferRepository.
countActiveBySourceGroupedByContractType()` — `GROUP BY contractType.label` en base). Affiché dans
`ExternalSourceDetail.tsx` sous forme de badges (Alternance/Stage en indigo, car prioritaires ;
CDI/CDD en gris neutre). Permet de vérifier directement l'effet de la pondération 2/3 (voir
*Calcul du quota* ci-dessus) sur les offres réellement importées.
