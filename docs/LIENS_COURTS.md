# Liens courts `itic.short.gy` → Espace entreprise du CRE

Relevé du **16/11/2026** (lot 8). Méthode : `curl -sI https://itic.short.gy/<slug>` pour chacun des 39 slugs de
l'annuaire (lot 2), en lisant l'en-tête `Location` **sans suivre la redirection** ; aucune connexion au compte Short.io,
aucun lien créé ni modifié. Pour les liens trouvés, la page cible du Google Sites a ensuite été ouverte (lecture seule)
pour vérifier qu'elle existe encore.

`<CRE>` = l'adresse publique du CRE en production (aujourd'hui le domaine du CRE pointe vers une adresse interne : à
régler avant de rediriger les liens, voir SUIVI.md, lot 2). La nouvelle page d'une formation est
`<CRE>/entreprise/candidats/<slug>` : **même slug que le lien court**, il suffit donc de changer la destination de
chaque lien dans Short.io.

## Résumé

- **28 liens existent** (302) sur 39 ; **11 n'existent pas** (404) : à créer dans le Short.io d'ITIC.
- **3 slugs que le lot 2 avait déduits existent bien** : `bts-gpme1a`, `bts-gpme2a`, `mast-com1a`. Ils sont maintenant
  marqués « confirmés » (V60 + annuaire par défaut).
- **2 liens existants pointent vers une page supprimée** du Google Sites : `bts-gpme1a`, `bts-gpme2a` (les pages
  actuelles sont `sam-gpme-1a` / `sam-gpme-2a`). Ils sont cassés aujourd'hui : la redirection vers le CRE les répare.
- Aucun des 11 liens manquants n'existe sous un autre nom proche (44 variantes essayées, ex. `bts-sisr`, `tp-rh`,
  `bts-ba`, `bts-immo1a`, `tp-sante`, `bach-commerce`, `bach-cmde3a`, `bach-finance`…) : **aucun slug n'a été changé**.
- 3 liens courts **hors annuaire** existent (trouvés en essayant les variantes) — voir « Liens orphelins ».

## Les 39 formations

| Niveau | Formation | Slug | Lien court existe | Cible actuelle (Google Sites) | Nouvelle cible CRE |
|---|---|---|---|---|---|
| BTS | SIO - 1A | `bts-sio1a` | oui | `…/entreprise/ioaizhswh` (BTS SIO 1A) | `<CRE>/entreprise/candidats/bts-sio1a` |
| BTS | SIO - 2A - SISR | `bts-sio2a-sisr` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-sio2a-sisr` |
| BTS | SIO - 2A - SLAM | `bts-sio2a-slam` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-sio2a-slam` |
| BTS | CI - 1A | `bts-ci1a` | oui | `…/entreprise/zdohxashod1182` (BTS CI 1A) | `<CRE>/entreprise/candidats/bts-ci1a` |
| BTS | CI - 2A | `bts-ci2a` | oui | `…/entreprise/ckbzx16` (BTS CI 2A) | `<CRE>/entreprise/candidats/bts-ci2a` |
| BTS | MCO - 1A | `bts-mco1a` | oui | `…/entreprise/ksjvbca61` (BTS MCO 1A) | `<CRE>/entreprise/candidats/bts-mco1a` |
| BTS | MCO - 2A | `bts-mco2a` | oui | `…/entreprise/oahwioa01` (BTS MCO 2A) | `<CRE>/entreprise/candidats/bts-mco2a` |
| BTS | NDRC - 1A | `bts-ndrc1a` | oui | `…/entreprise/aixhahiahs71` (BTS NDRC 1A) | `<CRE>/entreprise/candidats/bts-ndrc1a` |
| BTS | NDRC - 2A | `bts-ndrc2a` | oui | `…/entreprise/paueau8190` (BTS NDRC 2A) | `<CRE>/entreprise/candidats/bts-ndrc2a` |
| BTS | COM - 1A | `bts-com1a` | oui | `…/entreprise/18jqbsx197E` (BTS COM 1A) | `<CRE>/entreprise/candidats/bts-com1a` |
| BTS | COM - 2A | `bts-com2a` | oui | `…/entreprise/lxjxgqpwm01` (BTS COM 2A) | `<CRE>/entreprise/candidats/bts-com2a` |
| BTS | TP RH | `bts-tprh` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-tprh` |
| BTS | SAM / GPME - 1A | `bts-gpme1a` | oui | `…/entreprise/jhzfka71ns` — **page supprimée** (404 sur le Google Sites) | `<CRE>/entreprise/candidats/bts-gpme1a` |
| BTS | SAM / GPME - 2A | `bts-gpme2a` | oui | `…/entreprise/018ksaaswM` — **page supprimée** (404 sur le Google Sites) | `<CRE>/entreprise/candidats/bts-gpme2a` |
| BTS | CG - 1A | `bts-cg1a` | oui | `…/entreprise/oecoax1jsd` (BTS CG 1A) | `<CRE>/entreprise/candidats/bts-cg1a` |
| BTS | CG - 2A | `bts-cg2a` | oui | `…/entreprise/sjbxak917` (BTS CG 2A) | `<CRE>/entreprise/candidats/bts-cg2a` |
| BTS | B/A - 1A | `bts-ba1a` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-ba1a` |
| BTS | B/A - 2A | `bts-ba2a` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-ba2a` |
| BTS | PI - 1A | `bts-pi1a` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-pi1a` |
| BTS | PI - 2A | `bts-pi2a` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-pi2a` |
| BTS | TP Santé | `bts-tpsante` | **non** (404) | — | `<CRE>/entreprise/candidats/bts-tpsante` |
| Bachelor | Cybersécurité / Cloud | `bach-cyber` | oui | `…/entreprise/cyb9173` (BACH CYBER 3A) | `<CRE>/entreprise/candidats/bach-cyber` |
| Bachelor | Développeur Full Stack | `bach-fullstack` | oui | `…/entreprise/xaoih18` (BACH FULLSTACK 3A) | `<CRE>/entreprise/candidats/bach-fullstack` |
| Bachelor | Business Développeur | `bach-business` | **non** (404) | — | `<CRE>/entreprise/candidats/bach-business` |
| Bachelor | CMDE | `bach-cmde` | **non** (404) | — | `<CRE>/entreprise/candidats/bach-cmde` |
| Bachelor | RH | `bach-rh` | oui | `…/entreprise/rh819Z9` (BACH RH 3A) | `<CRE>/entreprise/candidats/bach-rh` |
| Bachelor | FCG | `bach-fcg` | **non** (404) | — | `<CRE>/entreprise/candidats/bach-fcg` |
| Mastère | Cyber - M1 | `mast-cyber1a` | oui | `…/entreprise/paux1892` (MAST CYBER 1A) | `<CRE>/entreprise/candidats/mast-cyber1a` |
| Mastère | Cyber - M2 | `mast-cyber2a` | oui | `…/entreprise/asufg16` (MAST CYBER 2A) | `<CRE>/entreprise/candidats/mast-cyber2a` |
| Mastère | Fullstack - M1 | `mast-fullstack1a` | oui | `…/entreprise/dosaj83` (MAST FULLSTACK 1A) | `<CRE>/entreprise/candidats/mast-fullstack1a` |
| Mastère | Fullstack - M2 | `mast-fullstack2a` | oui | `…/entreprise/ciahx7193` (MAST FULLSTACK 2A) | `<CRE>/entreprise/candidats/mast-fullstack2a` |
| Mastère | MSC - M1 | `mast-msc1a` | oui | `…/entreprise/xk13917` (MAST MSC 1A) | `<CRE>/entreprise/candidats/mast-msc1a` |
| Mastère | MSC - M2 | `mast-msc2a` | oui | `…/entreprise/xib19371` (MAST MSC 2A) | `<CRE>/entreprise/candidats/mast-msc2a` |
| Mastère | Communication - M1 | `mast-com1a` | oui | `…/entreprise/hfqnw192` (MAST COM 1A) | `<CRE>/entreprise/candidats/mast-com1a` |
| Mastère | Communication - M2 | `mast-com2a` | oui | `…/entreprise/xkbaoh71` (MAST COM 2A) | `<CRE>/entreprise/candidats/mast-com2a` |
| Mastère | MRH - M1 | `mast-mrh1a` | oui | `…/entreprise/idbxi99` (MAST MRH 1A) | `<CRE>/entreprise/candidats/mast-mrh1a` |
| Mastère | MRH - M2 | `mast-mrh2a` | oui | `…/entreprise/asin1829` (MAST MRH 2A) | `<CRE>/entreprise/candidats/mast-mrh2a` |
| Mastère | MSFO - M1 | `mast-msfo1a` | oui | `…/entreprise/axohbv08` (MAST MSFO 1A) | `<CRE>/entreprise/candidats/mast-msfo1a` |
| Mastère | MSFO - M2 | `mast-msfo2a` | oui | `…/entreprise/XGA193` (MAST MSFO 2A) | `<CRE>/entreprise/candidats/mast-msfo2a` |

## Liens manquants (à créer dans Short.io d'ITIC)

- `bts-sio2a-sisr` — BTS SIO - 2A - SISR → `<CRE>/entreprise/candidats/bts-sio2a-sisr`
- `bts-sio2a-slam` — BTS SIO - 2A - SLAM → `<CRE>/entreprise/candidats/bts-sio2a-slam`
- `bts-tprh` — BTS TP RH → `<CRE>/entreprise/candidats/bts-tprh`
- `bts-ba1a` — BTS B/A - 1A → `<CRE>/entreprise/candidats/bts-ba1a`
- `bts-ba2a` — BTS B/A - 2A → `<CRE>/entreprise/candidats/bts-ba2a`
- `bts-pi1a` — BTS PI - 1A → `<CRE>/entreprise/candidats/bts-pi1a`
- `bts-pi2a` — BTS PI - 2A → `<CRE>/entreprise/candidats/bts-pi2a`
- `bts-tpsante` — BTS TP Santé → `<CRE>/entreprise/candidats/bts-tpsante`
- `bach-business` — Bachelor Business Développeur → `<CRE>/entreprise/candidats/bach-business`
- `bach-cmde` — Bachelor CMDE → `<CRE>/entreprise/candidats/bach-cmde`
- `bach-fcg` — Bachelor FCG → `<CRE>/entreprise/candidats/bach-fcg`

## Liens orphelins (existent, mais ne correspondent à aucune formation de l'annuaire)

| Slug | Cible actuelle | Proposition |
|---|---|---|
| `bts-sio2a` | page supprimée (ancienne page commune SIO 2A) | rediriger vers `<CRE>/entreprise/candidats` (le visiteur choisit SISR ou SLAM) |
| `bach-com` | page « BACH COM 3A », encore en ligne mais absente du menu actuel | à trancher par l'équipe : rediriger vers `bach-cmde` (Communication & Marketing) ou vers `<CRE>/entreprise/candidats` |
| `bach-marketing` | page supprimée | rediriger vers `<CRE>/entreprise/candidats` |

## Remarques

- La page Google Sites de la formation « FCG » (`uzgciawp-0`) s'intitule « BACH FCA 3A » : libellé gardé « FCG » comme
  dans le menu du site ; l'équipe peut le corriger dans le back-office (Espace entreprise → Formations).
- Fiches à confirmer gardées telles quelles (lot 7) : Mastère Fullstack → EISI, MSC → MCM, Communication → MCM.
