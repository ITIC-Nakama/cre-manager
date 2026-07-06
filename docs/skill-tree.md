# Espace de Connaissances — Skill Tree

## Contexte

La section **Connaissances** (`/student/connaissances`) permet à l'étudiant de naviguer dans un arbre de compétences visuel. Chaque nœud représente une catégorie de contenu. En cliquant sur un nœud, l'étudiant accède aux articles de cette catégorie et peut valider les quiz associés pour gagner de l'XP.

---

## Flow utilisateur

```
/student/connaissances
  └── Arbre de compétences (nœuds = catégories)
        └── /student/connaissances/:categoryId
              └── Liste des articles de la catégorie
                    └── /student/connaissances/:categoryId/:articleId
                          └── Lecture de l'article + quiz
```

---

## Backend — aucun travail restant

Tous les endpoints sont disponibles et mergés dans `main`.

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/skill-tree/progress` | Progression complète de l'étudiant |
| `GET` | `/api/skill-tree/categories/{id}/articles` | Articles d'une catégorie |
| `GET` | `/api/skill-tree/articles/{id}` | Contenu complet d'un article |
| `GET` | `/api/skill-tree/articles/{articleId}/quiz` | Quiz + état de validation de l'étudiant |
| `POST` | `/api/skill-tree/quizzes/{quizId}/submit` | Soumettre les réponses → valide le quiz si score ≥ seuil |

### Réponse `/api/skill-tree/progress`

```json
{
  "nodes": [
    {
      "categoryId": "uuid",
      "categoryName": "CV & Candidature",
      "categoryIcon": "...",
      "ordre": 1,
      "totalArticles": 5,
      "completedArticles": 5,
      "state": "COMPLETED"
    }
  ],
  "xpTotal": 850,
  "totalArticles": 32,
  "completedArticles": 14
}
```

`state` : `TO_DISCOVER` | `IN_PROGRESS` | `COMPLETED`

Les nœuds sont retournés triés par `ordre` croissant — le frontend les affiche dans l'ordre du tableau.

### Réponse `/api/skill-tree/articles/{articleId}/quiz`

```json
{
  "id": "uuid",
  "scoreMinimum": 80,
  "dejaValide": false,
  "questions": [
    {
      "id": "uuid",
      "texte": "Quelle est la bonne réponse ?",
      "ordre": 1,
      "reponses": [
        { "id": "uuid", "texte": "Réponse A" },
        { "id": "uuid", "texte": "Réponse B" }
      ]
    }
  ]
}
```

`dejaValide: true` = l'étudiant a déjà validé ce quiz. Les réponses correctes ne sont **pas** exposées.

### Requête `POST /api/skill-tree/quizzes/{quizId}/submit`

```json
{
  "answers": [
    { "questionId": "uuid", "reponseIds": ["uuid", "uuid"] }
  ]
}
```

### Réponse `POST /api/skill-tree/quizzes/{quizId}/submit`

```json
{
  "score": 85,
  "passed": true,
  "xpAwarded": 40,
  "dejaValide": false
}
```

- `passed` : score ≥ `scoreMinimum`
- `xpAwarded` : XP attribuée (0 si déjà validé ou score insuffisant)
- `dejaValide` : `true` si l'étudiant avait déjà validé avant cette tentative — dans ce cas aucune XP n'est redonnée
- Un quiz validé (`passed = true` et `dejaValide = false`) met à jour `completedArticles` de la catégorie → invalider `useSkillTreeProgress` côté frontend

---

## Frontend

### Nouveaux types (`types/models/Skill.ts`)

```ts
export interface SkillNodeProgress {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  ordre: number;
  totalArticles: number;
  completedArticles: number;
  state: 'TO_DISCOVER' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SkillTreeProgress {
  nodes: SkillNodeProgress[];
  xpTotal: number;
  totalArticles: number;
  completedArticles: number;
}

export interface StudentAnswer {
  id: string;
  texte: string;
}

export interface StudentQuestion {
  id: string;
  texte: string;
  ordre: number;
  reponses: StudentAnswer[];
}

export interface StudentQuiz {
  id: string;
  scoreMinimum: number;
  dejaValide: boolean;
  questions: StudentQuestion[];
}

export interface QuizResult {
  score: number;
  passed: boolean;
  xpAwarded: number;
  dejaValide: boolean;
}

export interface SubmitQuizPayload {
  answers: { questionId: string; reponseIds: string[] }[];
}
```

### Nouvelles requêtes (`api-s/requests/SkillRequest.ts`)

```ts
fetchSkillTreeProgress(): Promise<SkillTreeProgress>
fetchStudentArticlesByCategory(categoryId: string): Promise<ArticleSummary[]>
fetchStudentArticle(id: string): Promise<Article>
fetchStudentQuiz(articleId: string): Promise<StudentQuiz>
submitStudentQuiz(quizId: string, payload: SubmitQuizPayload): Promise<QuizResult>
```

### Nouveaux hooks (`hooks/`)

```ts
useSkillTreeProgress()
useStudentArticlesByCategory(categoryId: string)
useStudentArticle(id: string)
useStudentQuiz(articleId: string)
useSubmitQuiz()
```

`useSubmitQuiz` on success :
- invalide `['skill-tree-progress']` → rafraîchit l'état des nœuds
- invalide `['student-quiz', articleId]` → rafraîchit `dejaValide`

### Routes (`App.tsx`)

```tsx
<Route path="/student/connaissances"                          element={<SkillTreePage />} />
<Route path="/student/connaissances/:categoryId"              element={<CategoryArticlesPage />} />
<Route path="/student/connaissances/:categoryId/:articleId"   element={<ArticleReaderPage />} />
```

---

## Composants à créer

### `pages/student/connaissances/SkillTreePage.tsx`
- Header : barre de progression globale (`completedArticles / totalArticles`), XP total, nombre de domaines
- Canvas zoom/pan (`react-zoom-pan-pinch`) avec courbes SVG entre les nœuds
- Nœuds affichés dans l'ordre retourné par l'API
- Légende : Complété / En cours / À découvrir
- Contrôles zoom +/−

### `SkillNode` (sous-composant de `SkillTreePage`)

| État | Couleur |
|---|---|
| `COMPLETED` | Orange |
| `IN_PROGRESS` | Bleu/violet |
| `TO_DISCOVER` | Gris foncé |

- Icône catégorie au centre
- Nom + `"X/Y articles"` ou `"complété"` en dessous
- Badge ✓ si `COMPLETED`, badge ⚡ si `IN_PROGRESS`
- Non cliquable si `totalArticles = 0`

### `pages/student/connaissances/CategoryArticlesPage.tsx`
- Breadcrumb : Connaissances → Catégorie
- Liste de cartes : titre article + statut (quiz validé / quiz disponible / sans quiz)

### `pages/student/connaissances/ArticleReaderPage.tsx`
- Breadcrumb : Connaissances → Catégorie → Article
- **Rendu du contenu** : le champ `contenu` est du HTML généré par l'éditeur Tiptap. Il est injecté via `dangerouslySetInnerHTML` dans un `<div>` portant la classe `ql-editor-replacement` (définie dans `TiptapEditor.tsx`) — cela applique automatiquement tous les styles : titres, listes, liens, images redimensionnables, vidéos.
- Si `hasQuiz = true` : composant `QuizSection` en bas de page
- Si `hasQuiz = false` : aucune section quiz

### `pages/student/connaissances/components/QuizSection.tsx`

**Récupération** : appel `useStudentQuiz(articleId)` → `GET /api/skill-tree/articles/{articleId}/quiz`

**Cas `dejaValide = true`** :
- Badge "Quiz validé ✓" + score obtenu
- Pas de nouveau passage possible (le backend refuse de re-donner l'XP de toute façon)

**Cas `dejaValide = false`** :
- Affichage des questions dans l'ordre (`ordre` croissant)
- Chaque question : énoncé + checkboxes (choix multiples possibles)
- Bouton "Soumettre" → appel `useSubmitQuiz` → `POST /api/skill-tree/quizzes/{quizId}/submit`
- **Après soumission** :
  - Si `passed = true` et `dejaValide = false` : écran succès avec XP gagnée, le nœud de la catégorie se met à jour automatiquement (invalidation de `skill-tree-progress`)
  - Si `passed = false` : score affiché, possibilité de réessayer (renvoyer le formulaire)
  - Si `passed = true` et `dejaValide = true` : l'étudiant avait déjà validé, pas d'XP, badge "Déjà validé"
