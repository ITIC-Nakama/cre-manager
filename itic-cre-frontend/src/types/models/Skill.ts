export interface SkillCategory {
  id: string;
  nom: string;
  description: string;
  ordre: number;
  icone: string;
  actif: boolean;
  createdById?: string;
  createdByEmail?: string;
  dateCreation?: string;
}

export interface ArticleSummary {
  id: string;
  titre: string;
  categoryId: string;
  categoryNom: string;
  ordre: number;
  hasQuiz: boolean;
  actif: boolean;
  createdById?: string;
  createdByEmail?: string;
  createdByFirstName?: string;
  createdByLastName?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface Article {
  id: string;
  titre: string;
  contenu: string;
  categoryId: string;
  categoryNom: string;
  ordre: number;
  hasQuiz: boolean;
  actif: boolean;
  createdById?: string;
  createdByEmail?: string;
  createdByFirstName?: string;
  createdByLastName?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface Answer {
  id?: string;
  texte: string;
  estCorrecte: boolean;
}

export type QuestionType = 'SINGLE' | 'MULTIPLE';

export interface Question {
  id?: string;
  texte: string;
  ordre: number;
  type?: QuestionType;
  answers: Answer[];
}

export interface Quiz {
  id: string;
  articleId: string;
  articleTitre: string;
  scoreMinimum: number;
  actif: boolean;
  questions: Question[];
}

// ─── STUDENT SKILL TREE ─────────────────────────────────────────────────────

export type SkillNodeState = 'TO_DISCOVER' | 'IN_PROGRESS' | 'COMPLETED';

export interface SkillNodeProgress {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  ordre: number;
  totalArticles: number;
  completedArticles: number;
  state: SkillNodeState;
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
  answers: StudentAnswer[];
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
