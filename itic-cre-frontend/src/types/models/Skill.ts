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
  hasQuiz: boolean;
  actif: boolean;
  createdById?: string;
  createdByEmail?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface Article {
  id: string;
  titre: string;
  contenu: string;
  categoryId: string;
  categoryNom: string;
  hasQuiz: boolean;
  actif: boolean;
  createdById?: string;
  createdByEmail?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface Answer {
  id?: string;
  texte: string;
  estCorrecte: boolean;
}

export interface Question {
  id?: string;
  texte: string;
  ordre: number;
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
